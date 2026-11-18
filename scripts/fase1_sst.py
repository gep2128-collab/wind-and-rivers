"""Fase 1: anomalía mensual de la temperatura del mar (TSM), 2005–hoy → data/public/sst/
Phase 1: monthly sea surface temperature anomaly, 2005–present → data/public/sst/

Fuente: ERA5 monthly means (Copernicus C3S, CC BY 4.0), variable sea_surface_temperature,
grilla de 2°, franja 40° N – 40° S (Pacífico tropical, Amazonía y Borneo).
Anomalía = TSM del mes − promedio 1991–2020 de ese mes (misma base que NOAA).

Salida: un archivo por año, data/public/sst/sst_anom_YYYY.js (~120 KB), que la página carga
cuando el usuario llega a ese año. Cada mes va como bytes (int8, 0.1 °C por unidad, −128 = tierra)
codificados en base64.

Uso / usage:  .venv/Scripts/python scripts/fase1_sst.py
"""
import base64
import json
import zipfile
from datetime import date
from pathlib import Path

import numpy as np
import xarray as xr
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "fase1"
OUT = ROOT / "data" / "public" / "sst"
START, CLIM = 2005, (1991, 2020)
GRID, AREA = 2.0, [40, -180, -40, 180]  # norte, oeste, sur, este


def download(years, months, target):
    if target.exists():
        return target
    from ecmwf.datastores import Client

    key = dotenv_values(ROOT / ".env")["COPERNICUS_KEY"].strip()
    Client(url="https://cds.climate.copernicus.eu/api", key=key).retrieve(
        "reanalysis-era5-single-levels-monthly-means",
        {
            "product_type": ["monthly_averaged_reanalysis"],
            "variable": ["sea_surface_temperature"],
            "year": [str(y) for y in years],
            "month": [f"{m:02d}" for m in months],
            "time": ["00:00"],
            "area": AREA,
            "grid": [GRID, GRID],
            "data_format": "netcdf",
        },
        target=str(target),
    )
    return target


def open_any(path):
    """CDS a veces devuelve un .zip con varios .nc dentro."""
    if zipfile.is_zipfile(path):
        d = path.with_suffix("")
        d.mkdir(exist_ok=True)
        with zipfile.ZipFile(path) as z:
            z.extractall(d)
        return xr.open_mfdataset(sorted(d.glob("*.nc")), combine="by_coords")
    return xr.open_dataset(path)


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    today = date.today()
    # ERA5 mensual se publica con ~1 mes de retraso
    last_y, last_m = (today.year, today.month - 1) if today.month > 1 else (today.year - 1, 12)
    files = [download(range(CLIM[0], last_y), range(1, 13), RAW / f"era5_sst_{CLIM[0]}_{last_y - 1}.nc")]
    try:
        files.append(download([last_y], range(1, last_m + 1), RAW / f"era5_sst_{last_y}_01_{last_m:02d}.nc"))
    except Exception as e:  # noqa: BLE001  (el último mes puede no estar publicado aún)
        print(f"Aviso: no se pudo bajar {last_y}-{last_m:02d}; se reintenta sin ese mes ({type(e).__name__})")
        files.append(download([last_y], range(1, last_m), RAW / f"era5_sst_{last_y}_01_{last_m - 1:02d}.nc"))

    sst = xr.concat([open_any(f)["sst"] for f in files], dim="valid_time").sortby("valid_time") - 273.15
    sst = sst.sortby("latitude", ascending=False)
    t = sst["valid_time"].dt
    clim = sst.sel(valid_time=(t.year >= CLIM[0]) & (t.year <= CLIM[1])).groupby("valid_time.month").mean()
    anom = (sst.groupby("valid_time.month") - clim).sel(valid_time=t.year >= START)

    lat, lon = anom["latitude"].values, anom["longitude"].values
    meta = {"nx": len(lon), "ny": len(lat), "lon0": float(lon[0]), "lat0": float(lat[0]),
            "dlon": float(lon[1] - lon[0]), "dlat": float(lat[1] - lat[0]), "scale": 0.1}
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for y in sorted(set(anom["valid_time"].dt.year.values.tolist())):
        sel = anom.sel(valid_time=anom["valid_time"].dt.year == y)
        months = {}
        for tt, arr in zip(sel["valid_time"].values, sel.values):
            q = np.where(np.isnan(arr), -128, np.clip(np.round(arr * 10), -127, 127)).astype(np.int8)
            months[str(tt)[:7]] = base64.b64encode(q.tobytes()).decode()
        payload = dict(meta, year=y, months=months)
        f = OUT / f"sst_anom_{y}.js"
        f.write_text("// Generado por scripts/fase1_sst.py. Datos: ERA5 (Copernicus C3S, CC BY 4.0)\n"
                     f"window.SST_ANOM&&SST_ANOM.add({json.dumps(payload, separators=(',', ':'))});\n",
                     encoding="utf-8")
        total += f.stat().st_size
    last = str(anom["valid_time"].values[-1])[:7]
    (OUT / "index.js").write_text(
        "// Años disponibles de anomalía de TSM (scripts/fase1_sst.py)\n"
        f"window.SST_INFO={json.dumps({'first': f'{START}-01', 'last': last, 'clim': f'{CLIM[0]}–{CLIM[1]}', 'source': 'ERA5 monthly SST, Copernicus C3S (CC BY 4.0)'})};\n",
        encoding="utf-8")

    # Comprobación: anomalía media en la caja Niño 1+2 (0–10° S, 90–80° O) frente al índice NOAA
    box = anom.sel(latitude=slice(0, -10), longitude=slice(-90, -80)).mean(["latitude", "longitude"])
    print(f"{len(list(OUT.glob('sst_anom_*.js')))} archivos en {OUT.relative_to(ROOT)} ({total // 1024} KB en total), {START}-01 a {last}")
    for k in ["2015-12", "2023-06", last]:
        v = box.sel(valid_time=box["valid_time"].dt.strftime("%Y-%m") == k).values
        if len(v):
            print(f"  Anomalía Niño 1+2 (ERA5) {k}: {float(v[0]):+.2f} °C")


if __name__ == "__main__":
    main()
