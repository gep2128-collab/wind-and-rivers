"""Fase 2 (global): viento, nubes y radiación ERA5 de todo el mundo a 2° para el mapa mundial, 2005–hoy → data/public/era5/global_YYYY.js
Phase 2 (global): world-wide ERA5 at 2° for the world map.

Complementa scripts/fase2_aire.py: las zonas de estudio siguen con su grilla fina de 0.5°, y esta capa
gruesa cubre el resto del mundo con viento, nubes y radiación reales (no simulados).
Mismo formato y misma cuantización que fase2_aire.py; la región "global" se agrega al final de
data/public/era5/index.js sin tocar las regiones existentes.
IMPORTANTE: si se vuelve a ejecutar fase2_aire.py (que reescribe index.js), ejecutar este script después.

Uso / usage:  .venv/Scripts/python scripts/fase2_global.py
"""
import json
import sys
from datetime import date
from pathlib import Path

import xarray as xr

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fase2_aire as A  # noqa: E402  (reutiliza descarga, apertura y escritura)

GRID = 2.0
AREA = [80, -180, -80, 180]  # norte, oeste, sur, este
VARS = ["10m_u_component_of_wind", "10m_v_component_of_wind", "total_cloud_cover",
        "surface_solar_radiation_downwards", "2m_temperature", "total_precipitation"]
RAW = A.ROOT / "data" / "raw" / "fase2_global"


def download(years, months, target):
    if target.exists():
        return target
    print(f"  pidiendo global {years[0]}–{years[-1]}…", flush=True)
    A.client().retrieve("reanalysis-era5-single-levels-monthly-means", {
        "product_type": ["monthly_averaged_reanalysis"], "variable": VARS,
        "year": [str(y) for y in years], "month": [f"{m:02d}" for m in months], "time": ["00:00"],
        "area": AREA, "grid": [GRID, GRID], "data_format": "netcdf", "download_format": "unarchived",
    }, target=str(target))
    return target


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    today = date.today()
    last_y, last_m = (today.year, today.month - 1) if today.month > 1 else (today.year - 1, 12)
    files = [download(list(range(y0, min(y0 + 9, last_y - 1) + 1)), range(1, 13), RAW / f"global_{y0}.nc")
             for y0 in range(A.START, last_y, 10)]
    for m in (last_m, last_m - 1):
        try:
            files.append(download([last_y], range(1, m + 1), RAW / f"global_{last_y}_01_{m:02d}.nc"))
            break
        except Exception as e:  # noqa: BLE001
            print(f"  aviso: {last_y}-{m:02d} aún no está ({type(e).__name__}); pruebo un mes antes")
    ds = xr.concat([A.open_any(f) for f in files], dim="valid_time").sortby("valid_time")
    ds = ds.sortby("latitude", ascending=False).sortby("longitude")
    ds["t2m_c"] = ds.t2m - 273.15
    ds["tp_mm"] = ds.tp * 1000
    ds["tcc_pc"] = ds.tcc * 100
    ds["ssrd_w"] = ds.ssrd / 86400
    # Solo viento, nubes y radiación en la capa mundial (~1 MB por año); temperatura y lluvia quedan en las zonas finas
    full = A.QUANT
    A.QUANT = {k: full[k] for k in ("u", "v", "tcc", "ssrd")}
    try:
        meta, first, last, size = A.write_grids("global", ds)
    finally:
        A.QUANT = full

    idx = A.OUT / "index.js"
    txt = idx.read_text(encoding="utf-8")
    info = json.loads(txt[txt.index("{"):txt.rindex("}") + 1])
    info["regions"].pop("global", None)
    info["regions"]["global"] = dict(meta, first=first, last=last)  # al final: las zonas finas tienen prioridad
    idx.write_text("// Generado por scripts/fase2_aire.py y scripts/fase2_global.py\n"
                   f"window.AIR_INFO={json.dumps(info, ensure_ascii=False)};\n", encoding="utf-8")
    print(f"global: {first} a {last}, grilla {meta['nx']}×{meta['ny']} a {GRID}°, {size // 1024} KB en total")
    k = "2015-12"
    if k in [str(t)[:7] for t in ds.valid_time.values]:
        s = ds.sel(valid_time=k, latitude=slice(5, -5), longitude=slice(-160, -100))
        print(f"  comprobación {k}, Pacífico ecuatorial: viento zonal medio {float(s.u10.mean()):+.1f} m/s "
              "(los alisios del este se debilitan con El Niño)")


if __name__ == "__main__":
    main()
