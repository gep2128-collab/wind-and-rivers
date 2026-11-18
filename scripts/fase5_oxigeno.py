"""Fase 5: productividad del bosque → O₂ producido y CO₂ absorbido al año → data/public/oxigeno.js
Phase 5: forest productivity → yearly O₂ produced and CO₂ taken up.

Fuente: MODIS MOD17A3HGF v6.1 (NASA LP DAAC), producción primaria neta (NPP) anual a 500 m.
NPP = carbono que las plantas fijan en un año, después de su propia respiración.
  O₂ bruto liberado  = NPP × 32/12   (1 mol de O₂ por cada mol de C fijado)
  CO₂ absorbido      = NPP × 44/12
Aviso: el bosque maduro consume casi todo ese O₂ (respiración del suelo y los animales);
su aporte neto de oxígeno a la atmósfera es cercano a cero. La web lo dice.

Descarga los mosaicos de 2015 (El Niño), 2022 (año normal) y 2023 a data/raw/fase5/ (~5 MB cada uno)
y los borra al terminar.

Uso / usage:  .venv/Scripts/python scripts/fase5_oxigeno.py
"""
import json
from pathlib import Path

import numpy as np
import requests
from dotenv import dotenv_values
from pyhdf.SD import SD, SDC

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "fase5"
REGIONS = {"amazon": (-82, -21, -43, 6), "borneo": (108, -5, 120, 8)}  # = ZONES en js/app.js
YEARS = [2015, 2022, 2023]
R, TILE, NPIX = 6371007.181, 1111950.5197665, 2400
PS = TILE / NPIX                                        # tamaño de píxel (m)
TOKEN = dotenv_values(ROOT / ".env")["EARTHDATA_TOKEN"].strip()


def granules(region, year):
    w, s, e, n = REGIONS[region]
    r = requests.get("https://cmr.earthdata.nasa.gov/search/granules.json", params={
        "short_name": "MOD17A3HGF", "version": "061", "bounding_box": f"{w},{s},{e},{n}",
        "temporal": f"{year}-01-01T00:00:00Z,{year}-12-31T23:59:59Z", "page_size": 100}, timeout=60)
    r.raise_for_status()
    return [l["href"] for g in r.json()["feed"]["entry"] for l in g["links"]
            if l["href"].startswith("https") and l["href"].endswith(".hdf")]


def fetch(url):
    p = RAW / url.rsplit("/", 1)[1]
    if not p.exists():
        with requests.get(url, headers={"Authorization": f"Bearer {TOKEN}"}, stream=True, timeout=300) as r:
            r.raise_for_status()
            with open(p, "wb") as f:
                for c in r.iter_content(1 << 20):
                    f.write(c)
    return p


def tile_sum(path, box):
    """kg de C al año dentro de la caja, y km² con vegetación."""
    name = path.name
    h, v = int(name.split(".h")[1][:2]), int(name.split(".h")[1][3:5])
    raw = SD(str(path), SDC.READ).select("Npp_500m")[:].astype(np.int32)
    rows, cols = np.mgrid[0:NPIX, 0:NPIX]
    y = (9 - v) * TILE - (rows + 0.5) * PS
    x = (h - 18) * TILE + (cols + 0.5) * PS
    lat = np.rad2deg(y / R)
    lon = np.rad2deg(x / (R * np.cos(np.deg2rad(lat))))
    w, s, e, n = box
    inside = (lat >= s) & (lat <= n) & (lon >= w) & (lon <= e) & (raw >= 0) & (raw <= 32700)
    npp = raw[inside] * 1e-4                             # kg C / m² / año
    return float(npp.sum() * PS * PS), float(inside.sum() * PS * PS / 1e6)


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    out = {"source": "MODIS MOD17A3HGF v6.1 net primary production (NASA LP DAAC, doi:10.5067/MODIS/MOD17A3HGF.061); "
                     "O2 = NPP x 32/12, CO2 uptake = NPP x 44/12",
           "years": YEARS, "regions": {}}
    for r, box in REGIONS.items():
        res = {}
        for y in YEARS:
            kgc, km2 = 0.0, 0.0
            for url in granules(r, y):
                p = fetch(url)
                a, b = tile_sum(p, box)
                kgc += a
                km2 += b
                p.unlink()
            res[str(y)] = {"npp_mt_c": round(kgc / 1e9, 1), "o2_mt": round(kgc / 1e9 * 32 / 12, 1),
                           "co2_uptake_mt": round(kgc / 1e9 * 44 / 12, 1), "vegetated_km2": round(km2)}
            print(f"{r} {y}: NPP {kgc / 1e9:,.0f} Mt C → O₂ {kgc / 1e9 * 32 / 12:,.0f} Mt, "
                  f"CO₂ absorbido {kgc / 1e9 * 44 / 12:,.0f} Mt, vegetación {km2:,.0f} km²", flush=True)
        out["regions"][r] = res
    f = ROOT / "data" / "public" / "oxigeno.js"
    f.write_text("// Generado por scripts/fase5_oxigeno.py. Datos: MODIS MOD17A3HGF (NASA)\n"
                 f"window.OXIGENO={json.dumps(out, ensure_ascii=False)};\n", encoding="utf-8")
    print("Listo.")


if __name__ == "__main__":
    main()
