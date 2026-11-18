"""Fase 3b: CO₂ de incendios y área quemada mensual en la Amazonía y Borneo, 2005–hoy → data/public/co2_regional.js
Phase 3b: monthly fire CO₂ emissions and burned area in the Amazon and Borneo, 2005–present.

Fuentes / sources:
  - GFED5.1 (van der Werf, Chen et al., Zenodo 10.5281/zenodo.16794692, CC BY 4.0), 0.25°, hasta 2022:
      GFED5.1_monthly_YYYY.nc   → CO2 (g por mes)
      GFED5.1_ecosystem_YYYY.nc → burned_area (m² por mes)
  - Desde 2023, GFED5.1 aún no está publicado:
      CO₂: CAMS GFAS (Copernicus Atmosphere Monitoring Service, ADS), "wildfire flux of CO2", diario a 0.1°,
           multiplicado por la razón GFED/GFAS de cada región en 2019–2022 (ambos coinciden esos años).
      Área quemada: focos FIRMS del mes × hectáreas por foco de esa región (mediana 2005–2022, por mes del año).
    Esos meses se marcan con "estimated": true.

Los zip de GFED (1.74 GB + 0.30 GB) se descargan en data/raw/fase3/ y se pueden borrar después.
Necesita data/public/fuego_mensual.js (scripts/fase3_firms.py) y COPERNICUS_KEY en .env (vale también para ADS).

Uso / usage:  .venv/Scripts/python scripts/fase3_gfed.py
"""
import json
import re
import zipfile
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import requests
import xarray as xr
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "fase3"
START = 2005
REGIONS = {"amazon": (-82, -21, -43, 6), "borneo": (108, -5, 120, 8)}  # = ZONES en js/app.js
ZEN = "https://zenodo.org/records/16794692/files/{}?download=1"
OVERLAP = range(2019, 2023)


def zip_path(name):
    p = RAW / name
    if not p.exists():
        print(f"  descargando {name}…", flush=True)
        with requests.get(ZEN.format(name), stream=True, timeout=600) as r:
            r.raise_for_status()
            with open(p, "wb") as f:
                for chunk in r.iter_content(1 << 22):
                    f.write(chunk)
    return p


def box(ds, region):
    w, s, e, n = REGIONS[region]
    lat = slice(s, n) if ds.lat[0] < ds.lat[-1] else slice(n, s)
    return ds.sel(lon=slice(w, e), lat=lat)


def gfed_series():
    """{region: {month: (co2_g, burned_m2)}} desde los archivos de GFED5.1."""
    out = {r: {} for r in REGIONS}
    zm, ze = zipfile.ZipFile(zip_path("GFED5.1_monthly.zip")), zipfile.ZipFile(zip_path("GFED5.1_ecosystem.zip"))
    years = sorted(int(m.group(1)) for n in zm.namelist() if (m := re.fullmatch(r"GFED5\.1_monthly_(\d{4})\.nc", n)))
    tmp = RAW / "gfed"
    tmp.mkdir(exist_ok=True)
    for y in [y for y in years if y >= START]:
        fm, fe = f"GFED5.1_monthly_{y}.nc", f"GFED5.1_ecosystem_{y}.nc"
        zm.extract(fm, tmp)
        ze.extract(fe, tmp)
        with xr.open_dataset(tmp / fm) as dm, xr.open_dataset(tmp / fe) as de:
            for r in REGIONS:
                co2 = box(dm.CO2, r).sum(["lat", "lon"]).values
                ba = box(de.burned_area, r).sum(["lat", "lon"]).values
                for i, t in enumerate(dm.time.values):
                    out[r][str(t)[:7]] = (float(co2[i]), float(ba[i]))
        (tmp / fm).unlink()
        (tmp / fe).unlink()
        print(f"  GFED5.1 {y} listo", flush=True)
    return out, years[-1]


def gfas_series(years):
    """{region: {month: co2_kg}} desde CAMS GFAS (flujo kg m⁻² s⁻¹ diario a 0.1°)."""
    from ecmwf.datastores import Client

    key = dotenv_values(ROOT / ".env")["COPERNICUS_KEY"].strip()
    c = Client(url="https://ads.atmosphere.copernicus.eu/api", key=key)
    last = date.today().replace(day=1) - timedelta(days=1)
    out = {r: {} for r in REGIONS}
    for r, (w, s, e, n) in REGIONS.items():
        for y in years:
            end = min(date(y, 12, 31), last)
            target = RAW / f"gfas_{r}_{y}.nc"
            if not target.exists():
                print(f"  pidiendo GFAS {r} {y}…", flush=True)
                c.retrieve("cams-global-fire-emissions-gfas", {
                    "variable": ["wildfire_flux_of_carbon_dioxide"],
                    "date": [f"{y}-01-01/{end}"], "area": [n, w, s, e], "data_format": "netcdf",
                }, target=str(target))
            with xr.open_dataset(target) as ds:
                v = [k for k in ds.data_vars if "co2" in k.lower()][0]
                da = ds[v]
                tdim = "valid_time" if "valid_time" in da.dims else "time"
                lat = da["latitude"]
                # área de cada celda de 0.1° en m² / area of each 0.1° cell in m²
                area = (6371000.0 ** 2) * np.deg2rad(0.1) * np.deg2rad(0.1) * np.cos(np.deg2rad(lat))
                daily = (da * area).sum(["latitude", "longitude"]) * 86400  # kg por día
                monthly = daily.groupby(daily[tdim].dt.strftime("%Y-%m")).sum()
                for k, val in zip(monthly["strftime"].values, monthly.values):
                    out[r][str(k)] = float(val)
    return out


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    firms = json.loads((ROOT / "data" / "public" / "fuego_mensual.js").read_text(encoding="utf-8").split("=", 1)[1].rstrip().rstrip(";"))
    months = firms["months"]
    gfed, gfed_last = gfed_series()
    gfas = gfas_series(list(range(OVERLAP[0], int(months[-1][:4]) + 1)))
    res = {"months": months, "regions": {},
           "source": ("GFED5.1 (van der Werf, Chen et al., CC BY 4.0) to " + str(gfed_last)
                      + "; later months estimated: CO2 from CAMS GFAS scaled to GFED, burned area from FIRMS hotspots"),
           "units": {"co2_mt": "million tonnes CO2 per month", "burned_ha": "hectares per month"}}
    for r in REGIONS:
        hot = dict(zip(months, firms["regions"][r]["hotspots"]))
        ov = [m for m in gfed[r] if int(m[:4]) in OVERLAP and gfas[r].get(m)]
        k_co2 = sum(gfed[r][m][0] / 1000 for m in ov) / sum(gfas[r][m] for m in ov)  # g→kg / kg
        # hectáreas por foco, por mes del año / hectares per hotspot, per calendar month
        ha_per = {}
        for mm in range(1, 13):
            vals = [gfed[r][m][1] / 1e4 / hot[m] for m in gfed[r] if int(m[5:]) == mm and hot.get(m, 0) > 20]
            ha_per[mm] = float(np.median(vals)) if vals else 0.0
        co2, ba, est = [], [], []
        for m in months:
            if m in gfed[r]:
                c, b, e = gfed[r][m][0] / 1e12, gfed[r][m][1] / 1e4, False
            else:
                c, b, e = gfas[r].get(m, 0.0) * k_co2 / 1e9, hot.get(m, 0) * ha_per[int(m[5:])], True
            co2.append(round(c, 3))
            ba.append(round(b))
            est.append(e)
        res["regions"][r] = {"co2_mt": co2, "burned_ha": ba, "estimated": est,
                             "gfas_scale": round(k_co2, 3)}
        yrs = {}
        for m, c, b in zip(months, co2, ba):
            yrs.setdefault(m[:4], [0, 0])
            yrs[m[:4]][0] += c
            yrs[m[:4]][1] += b
        print(f"{r}: escala GFED/GFAS {k_co2:.2f}")
        print("  CO2 Mt/año: " + ", ".join(f"{y}:{v[0]:.0f}" for y, v in yrs.items()))
        print("  millones de ha quemadas/año: " + ", ".join(f"{y}:{v[1] / 1e6:.2f}" for y, v in yrs.items()))
    (ROOT / "data" / "public" / "co2_regional.js").write_text(
        "// Generado por scripts/fase3_gfed.py\n"
        f"window.CO2={json.dumps(res, ensure_ascii=False, separators=(',', ':'))};\n", encoding="utf-8")
    print("Listo.")


if __name__ == "__main__":
    main()
