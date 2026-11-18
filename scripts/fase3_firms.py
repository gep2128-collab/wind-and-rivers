"""Fase 3a: focos de incendio mensuales (NASA FIRMS, MODIS) en la Amazonía y Borneo, 2005–hoy.
Phase 3a: monthly fire hotspots (NASA FIRMS, MODIS) in the Amazon and Borneo, 2005–present.

Fuente: NASA FIRMS, MODIS Collection 6.1 (Terra y Aqua, 1 km). Se usa MODIS y no VIIRS porque cubre
todo el periodo 2005–2026 con el mismo sensor, así los años se pueden comparar entre sí.
Filtro: solo "presumed vegetation fire" (type = 0) y confianza ≥ 30 %.
  - 2005 a 2025: archivos anuales por país (sin clave), recortados a las cajas de estudio.
  - 2026: API de FIRMS (MODIS_SP y MODIS_NRT) con FIRMS_MAP_KEY de .env, en tramos de 5 días.

Salida:
  data/public/fuego/<region>_<YYYY>.js  focos por celda de 0.5° y mes (uint16 en base64)
  data/public/fuego/index.js            grillas y meses disponibles
  data/public/fuego_mensual.js          serie mensual por región: número de focos y potencia radiativa (FRP)

Uso / usage:  .venv/Scripts/python scripts/fase3_firms.py
"""
import base64
import io
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import requests
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "fase3" / "firms"
OUT = ROOT / "data" / "public" / "fuego"
START, GRID = 2005, 0.5
REGIONS = {"amazon": (-82, -21, -43, 6), "borneo": (108, -5, 120, 8)}  # = ZONES en js/app.js
COUNTRIES = {
    "amazon": ["Brazil", "Peru", "Bolivia", "Colombia", "Ecuador", "Venezuela", "Guyana", "Suriname",
               "French_Guiana", "Paraguay", "Panama"],
    "borneo": ["Indonesia", "Malaysia", "Brunei_Darussalam"],
}
COLS = ["latitude", "longitude", "acq_date", "confidence", "frp", "type"]
SOURCE = "NASA FIRMS, MODIS Collection 6.1 active fires (MCD14), type 0, confidence ≥ 30 %"


def last_full_month():
    t = date.today().replace(day=1) - timedelta(days=1)
    return t.year, t.month


def country_year(country, year):
    """Un CSV anual por país, guardado en data/raw (ignorado por git)."""
    f = RAW / f"modis_{year}_{country}.csv"
    if not f.exists():
        r = requests.get(f"https://firms.modaps.eosdis.nasa.gov/data/country/modis/{year}/modis_{year}_{country}.csv",
                         timeout=600)
        if r.status_code == 404:
            return None
        r.raise_for_status()
        f.write_bytes(r.content)
    return pd.read_csv(f, usecols=COLS)


def api_2026(region, year, last_m):
    key = dotenv_values(ROOT / ".env").get("FIRMS_MAP_KEY", "").strip()
    if not key:
        print("  aviso: falta FIRMS_MAP_KEY; se omite", year)
        return None
    w, s, e, n = REGIONS[region]
    f = RAW / f"api_{region}_{year}_01_{last_m:02d}.csv"
    if f.exists():
        return pd.read_csv(f)
    nrt_from = date(year, 9, 1)  # MODIS_SP llega hasta fin de agosto (ver data_availability)
    end = date(year, last_m, 1).replace(day=28) + timedelta(days=4)
    end = end - timedelta(days=end.day)
    parts, d = [], date(year, 1, 1)
    while d <= end:
        days = min(5, (end - d).days + 1)  # la API acepta 1 a 5 días por consulta
        src = "MODIS_SP" if d < nrt_from else "MODIS_NRT"
        if d < nrt_from:
            days = min(days, (nrt_from - d).days)
        url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/{src}/{w},{s},{e},{n}/{days}/{d}"
        r = requests.get(url, timeout=300)
        if not r.ok:  # sin imprimir la URL, que lleva la clave / without printing the URL, which holds the key
            raise SystemExit(f"FIRMS API {src} {d}: HTTP {r.status_code} {r.text[:120]}")
        if r.text.startswith("latitude"):
            parts.append(pd.read_csv(io.StringIO(r.text)))
        d += timedelta(days=days)
    df = pd.concat(parts, ignore_index=True)
    if "type" not in df:  # NRT no trae "type": se aceptan todos / NRT has no "type": keep all
        df["type"] = 0
    df["confidence"] = pd.to_numeric(df["confidence"], errors="coerce").fillna(50)
    df = df[COLS]
    df.to_csv(f, index=False)
    return df


def clean(df, region):
    w, s, e, n = REGIONS[region]
    df = df[(df.type == 0) & (df.confidence >= 30)]
    df = df[(df.longitude >= w) & (df.longitude < e) & (df.latitude > s) & (df.latitude <= n)]
    return df.assign(month=df.acq_date.str.slice(0, 7))


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    ly, lm = last_full_month()
    months = [f"{y}-{m:02d}" for y in range(START, ly + 1) for m in range(1, 13) if (y, m) <= (ly, lm)]
    info, serie = {"source": SOURCE, "grid": GRID, "regions": {}}, {"source": SOURCE + "; counts inside the study box",
                                                                     "months": months, "regions": {}}
    for region, (w, s, e, n) in REGIONS.items():
        nx, ny = round((e - w) / GRID), round((n - s) / GRID)
        meta = {"region": region, "nx": nx, "ny": ny, "lon0": w + GRID / 2, "lat0": n - GRID / 2, "dlon": GRID, "dlat": -GRID}
        jobs = [(c, y) for y in range(START, ly) for c in COUNTRIES[region]]
        print(f"{region}: {len(jobs)} archivos país-año…", flush=True)
        with ThreadPoolExecutor(4) as ex:
            frames = [f for f in ex.map(lambda j: country_year(*j), jobs) if f is not None]
        frames.append(api_2026(region, ly, lm))
        df = clean(pd.concat([f for f in frames if f is not None], ignore_index=True), region)
        # una detección puede aparecer en dos países vecinos: quitar duplicados exactos
        df = df.drop_duplicates(["latitude", "longitude", "acq_date", "frp"])
        df = df[df.month.isin(months)]
        ix = np.clip(((df.longitude - w) / GRID).astype(int), 0, nx - 1)
        iy = np.clip(((n - df.latitude) / GRID).astype(int), 0, ny - 1)
        df = df.assign(cell=iy * nx + ix)
        cnt = df.groupby(["month", "cell"]).size()
        total = 0
        for y in range(START, ly + 1):
            ms = {}
            for m in [k for k in months if k.startswith(str(y))]:
                g = np.zeros(nx * ny, dtype=np.uint16)
                if m in cnt.index.get_level_values(0):
                    c = cnt.loc[m]
                    g[c.index.values] = np.minimum(c.values, 65535)
                ms[m] = base64.b64encode(g.tobytes()).decode()
            f = OUT / f"{region}_{y}.js"
            f.write_text(f"// Generado por scripts/fase3_firms.py. Datos: {SOURCE}\n"
                         f"window.FIRE&&FIRE.add({json.dumps(dict(meta, year=y, months=ms), separators=(',', ':'))});\n",
                         encoding="utf-8")
            total += f.stat().st_size
        bym = df.groupby("month").agg(n=("frp", "size"), frp=("frp", "sum"))
        serie["regions"][region] = {"hotspots": [int(bym.n.get(m, 0)) for m in months],
                                    "frp_mw": [round(float(bym.frp.get(m, 0)), 0) for m in months]}
        info["regions"][region] = dict(meta, first=months[0], last=months[-1])
        yr = df.groupby(df.month.str.slice(0, 4)).size()
        print(f"  {len(df):,} focos, {total // 1024} KB; año con más focos: {yr.idxmax()} ({yr.max():,})")
        print("  por año: " + ", ".join(f"{k}:{v:,}" for k, v in yr.items()))
    (OUT / "index.js").write_text("// Generado por scripts/fase3_firms.py\n"
                                  f"window.FIRE_INFO={json.dumps(info, ensure_ascii=False)};\n", encoding="utf-8")
    (ROOT / "data" / "public" / "fuego_mensual.js").write_text(
        "// Generado por scripts/fase3_firms.py\n"
        f"window.FUEGO={json.dumps(serie, ensure_ascii=False, separators=(',', ':'))};\n", encoding="utf-8")
    print("Listo.")


if __name__ == "__main__":
    main()
