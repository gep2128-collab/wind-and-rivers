"""Fase 2: aire y clima regional de la Amazonía y Borneo, 2005–hoy → data/public/era5/ y data/public/clima_regional.js
Phase 2: air and regional climate for the Amazon and Borneo, 2005–present.

Fuente: ERA5 monthly means (Copernicus C3S, CC BY 4.0), grilla de 0.5°.
Variables del mapa: viento 10 m (u, v), nubosidad, radiación solar en superficie, temperatura 2 m, lluvia.
Series regionales (solo celdas de tierra): temperatura, lluvia, nubosidad y humedad relativa,
con su anomalía frente al promedio 1991–2020 de cada mes.

Salida:
  data/public/era5/<region>_<YYYY>.js  un archivo por región y año (~100–450 KB). Cada mes y variable va
                                        como bytes int8 en base64: valor = q·scale + offset; −128 = sin dato.
  data/public/era5/index.js            regiones, grillas, escalas y meses disponibles.
  data/public/clima_regional.js        series mensuales por región (valores y anomalías).

Uso / usage:  .venv/Scripts/python scripts/fase2_aire.py
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
RAW = ROOT / "data" / "raw" / "fase2"
OUT = ROOT / "data" / "public" / "era5"
START, CLIM, GRID = 2005, (1991, 2020), 0.5
REGIONS = {"amazon": (-82, -21, -43, 6), "borneo": (108, -5, 120, 8)}  # = ZONES en js/app.js
ERA5_VARS = ["10m_u_component_of_wind", "10m_v_component_of_wind", "total_cloud_cover",
             "surface_solar_radiation_downwards", "2m_temperature", "2m_dewpoint_temperature",
             "total_precipitation", "land_sea_mask"]
# variable del mapa: (scale, offset). valor = q*scale + offset, q en −127..127
QUANT = {"u": (0.1, 0), "v": (0.1, 0), "tcc": (1, 0), "ssrd": (2, 200), "t2m": (0.25, 15), "tp": (0.2, 25)}
SOURCE = "ERA5 monthly means, Copernicus Climate Change Service (C3S), CC BY 4.0"


def client():
    from ecmwf.datastores import Client
    return Client(url="https://cds.climate.copernicus.eu/api", key=dotenv_values(ROOT / ".env")["COPERNICUS_KEY"].strip())


def download(region, years, months, target):
    if target.exists():
        return target
    w, s, e, n = REGIONS[region]
    print(f"  pidiendo {region} {years[0]}–{years[-1]} ({len(months)} meses/año)…", flush=True)
    client().retrieve("reanalysis-era5-single-levels-monthly-means", {
        "product_type": ["monthly_averaged_reanalysis"], "variable": ERA5_VARS,
        "year": [str(y) for y in years], "month": [f"{m:02d}" for m in months], "time": ["00:00"],
        "area": [n, w, s, e], "grid": [GRID, GRID], "data_format": "netcdf", "download_format": "unarchived",
    }, target=str(target))
    return target


def open_any(path):
    """Copernicus entrega un .zip con un .nc por tipo de variable; ssrd y tp llegan fechados a las 06:00."""
    if zipfile.is_zipfile(path):
        d = path.with_suffix(".parts")
        with zipfile.ZipFile(path) as z:
            z.extractall(d)
        parts = [xr.open_dataset(f) for f in sorted(d.glob("*.nc"))]
    else:
        parts = [xr.open_dataset(path)]
    fixed = [p.assign_coords(valid_time=p.valid_time.values.astype("datetime64[M]").astype("datetime64[ns]"))
             for p in parts]
    ds = xr.merge(fixed, compat="override", join="outer")
    return ds.drop_vars([v for v in ("expver", "number") if v in ds.coords or v in ds], errors="ignore")


def region_data(region):
    today = date.today()
    last_y, last_m = (today.year, today.month - 1) if today.month > 1 else (today.year - 1, 12)
    # Copernicus limita el tamaño de cada pedido: bloques de 10 años / Copernicus caps request size: 10-year blocks
    files = []
    for y0 in range(CLIM[0], last_y, 10):
        y1 = min(y0 + 9, last_y - 1)
        files.append(download(region, list(range(y0, y1 + 1)), range(1, 13), RAW / f"{region}_{y0}_{y1}.nc"))
    for m in (last_m, last_m - 1):  # el último mes puede no estar publicado aún
        try:
            files.append(download(region, [last_y], range(1, m + 1), RAW / f"{region}_{last_y}_01_{m:02d}.nc"))
            break
        except Exception as e:  # noqa: BLE001
            print(f"  aviso: {last_y}-{m:02d} aún no está ({type(e).__name__}); pruebo un mes antes")
    ds = xr.concat([open_any(f) for f in files], dim="valid_time").sortby("valid_time")
    ds = ds.sortby("latitude", ascending=False).sortby("longitude")
    # unidades de la web / web units
    ds["t2m_c"] = ds.t2m - 273.15
    ds["d2m_c"] = ds.d2m - 273.15
    ds["tp_mm"] = ds.tp * 1000          # m/día → mm/día
    ds["tcc_pc"] = ds.tcc * 100
    ds["ssrd_w"] = ds.ssrd / 86400      # J/m² por día → W/m²
    es = lambda t: 6.112 * np.exp(17.62 * t / (243.12 + t))  # noqa: E731  (Magnus)
    ds["rh"] = (100 * es(ds.d2m_c) / es(ds.t2m_c)).clip(0, 100)
    return ds


def quant(arr, scale, offset):
    q = np.where(np.isnan(arr), -128, np.clip(np.round((arr - offset) / scale), -127, 127)).astype(np.int8)
    return base64.b64encode(q.tobytes()).decode()


def write_grids(region, ds):
    sel = ds.sel(valid_time=ds.valid_time.dt.year >= START)
    lat, lon = sel.latitude.values, sel.longitude.values
    meta = {"region": region, "nx": len(lon), "ny": len(lat), "lon0": float(lon[0]), "lat0": float(lat[0]),
            "dlon": float(lon[1] - lon[0]), "dlat": float(lat[1] - lat[0])}
    src = {"u": "u10", "v": "v10", "tcc": "tcc_pc", "ssrd": "ssrd_w", "t2m": "t2m_c", "tp": "tp_mm"}
    total = 0
    for y in sorted(set(sel.valid_time.dt.year.values.tolist())):
        sy = sel.sel(valid_time=sel.valid_time.dt.year == y)
        months = {}
        for i, t in enumerate(sy.valid_time.values):
            months[str(t)[:7]] = {k: quant(sy[src[k]].values[i], *QUANT[k]) for k in QUANT}
        f = OUT / f"{region}_{y}.js"
        f.write_text(f"// Generado por scripts/fase2_aire.py. Datos: {SOURCE}\n"
                     f"window.AIR&&AIR.add({json.dumps(dict(meta, year=y, months=months), separators=(',', ':'))});\n",
                     encoding="utf-8")
        total += f.stat().st_size
    return meta, str(sel.valid_time.values[0])[:7], str(sel.valid_time.values[-1])[:7], total


def series(ds):
    """Media de las celdas de tierra, ponderada por el área (coseno de la latitud)."""
    land = ds.lsm.isel(valid_time=0) > 0.5
    wgt = np.cos(np.deg2rad(ds.latitude)) * land
    out = {}
    for name, var in {"t2m": "t2m_c", "tp": "tp_mm", "tcc": "tcc_pc", "rh": "rh"}.items():
        s = ds[var].weighted(wgt).mean(["latitude", "longitude"])
        t = s.valid_time.dt
        clim = s.sel(valid_time=(t.year >= CLIM[0]) & (t.year <= CLIM[1])).groupby("valid_time.month").mean()
        anom = s.groupby("valid_time.month") - clim
        keep = s.valid_time.dt.year >= START
        out[name] = {"value": [round(float(v), 2) for v in s.sel(valid_time=keep).values],
                     "anom": [round(float(v), 2) for v in anom.sel(valid_time=keep).values],
                     "normal": [round(float(v), 2) for v in clim.values]}
    months = [str(t)[:7] for t in ds.valid_time.sel(valid_time=ds.valid_time.dt.year >= START).values]
    return months, out


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    info = {"source": SOURCE, "grid": GRID, "quant": QUANT, "regions": {}}
    clima = {"source": SOURCE + "; land cells only, area-weighted; anomaly vs 1991–2020",
             "units": {"t2m": "°C", "tp": "mm/day", "tcc": "%", "rh": "%"}, "regions": {}}
    for region in REGIONS:
        print(f"{region}:", flush=True)
        ds = region_data(region)
        meta, first, last, size = write_grids(region, ds)
        info["regions"][region] = dict(meta, first=first, last=last)
        months, s = series(ds)
        clima["months"] = months
        clima["regions"][region] = s
        print(f"  mapa: {first} a {last}, grilla {meta['nx']}×{meta['ny']}, {size // 1024} KB")
        t, p = s["t2m"], s["tp"]
        print(f"  tierra: temperatura media {np.mean(t['value']):.1f} °C, lluvia media {np.mean(p['value']):.1f} mm/día")
        for k in ("2015-10", "2023-10", last):
            if k in months:
                i = months.index(k)
                print(f"  {k}: temp {t['anom'][i]:+.2f} °C, lluvia {p['anom'][i]:+.2f} mm/día frente a lo normal")
    (OUT / "index.js").write_text("// Generado por scripts/fase2_aire.py\n"
                                  f"window.AIR_INFO={json.dumps(info, ensure_ascii=False)};\n", encoding="utf-8")
    (ROOT / "data" / "public" / "clima_regional.js").write_text(
        "// Generado por scripts/fase2_aire.py\n"
        f"window.CLIMA={json.dumps(clima, ensure_ascii=False, separators=(',', ':'))};\n", encoding="utf-8")
    print("Listo.")


if __name__ == "__main__":
    main()
