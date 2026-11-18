"""Descarga datos mensuales de ERA5 y los convierte al JSON que carga la página.
Downloads ERA5 monthly data and converts it to the JSON the page loads.

Uso / usage:
  .venv/Scripts/python scripts/era5_to_json.py --region amazon
  .venv/Scripts/python scripts/era5_to_json.py --region borneo --years 2015-2024 --grid 0.5
  .venv/Scripts/python scripts/era5_to_json.py --from-file data/raw/era5/mi_archivo.nc --region amazon

Luego en la página: "Load ERA5 (.json)" y elige el archivo de data/raw/era5/.
Then in the page: "Load ERA5 (.json)" and pick the file from data/raw/era5/.

Necesita COPERNICUS_KEY en .env y haber aceptado la licencia de ERA5 en la web de Copernicus.
Needs COPERNICUS_KEY in .env and the ERA5 licence accepted on the Copernicus website.
Datos: ERA5 (Hersbach et al., 2020), Copernicus Climate Change Service, licencia CC-BY 4.0.
"""
import argparse
import json
import math
import zipfile
from pathlib import Path

import numpy as np
import xarray as xr
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "raw" / "era5"

# Igual que ZONES en js/app.js: oeste, sur, este, norte / Same as ZONES in js/app.js: west, south, east, north
REGIONS = {
    "amazon": (-82, -21, -43, 6),
    "borneo": (108, -5, 120, 8),
    "world": (-180, -90, 180, 90),
}
# Nombre en el JSON -> variable de ERA5 / JSON name -> ERA5 variable
VARIABLES = {
    "u": "10m_u_component_of_wind",
    "v": "10m_v_component_of_wind",
    "tcc": "total_cloud_cover",
    "ssrd": "surface_solar_radiation_downwards",
}
# Nombres cortos dentro del NetCDF / short names inside the NetCDF
NC_NAMES = {"u": "u10", "v": "v10", "tcc": "tcc", "ssrd": "ssrd"}
DECIMALS = {"u": 2, "v": 2, "tcc": 2, "ssrd": 1}


def parse_years(text):
    a, _, b = text.partition("-")
    y0, y1 = int(a), int(b or a)
    if y0 > y1:
        raise SystemExit("--years: el primer año debe ser menor / first year must be smaller")
    return y0, y1


def download(region, y0, y1, grid, names):
    env = {k: (v or "").strip() for k, v in dotenv_values(ROOT / ".env").items()}
    key = env.get("COPERNICUS_KEY")
    if not key:
        raise SystemExit("Falta COPERNICUS_KEY en .env / COPERNICUS_KEY missing from .env")
    from ecmwf.datastores import Client

    w, s, e, n = REGIONS[region]
    target = OUT / f"era5_{region}_{y0}-{y1}_{grid:g}deg.download"
    if target.exists():
        print(f"Ya descargado / already downloaded: {target.name}")
        return target
    print(f"Pidiendo a Copernicus {y1 - y0 + 1} años de {', '.join(names)} para {region}. "
          "Puede quedar en cola varios minutos. / Request queued, this can take several minutes.", flush=True)
    Client(url="https://cds.climate.copernicus.eu/api", key=key).retrieve(
        "reanalysis-era5-single-levels-monthly-means",
        {
            "product_type": ["monthly_averaged_reanalysis"],
            "variable": [VARIABLES[k] for k in names],
            "year": [str(y) for y in range(y0, y1 + 1)],
            "month": [f"{m:02d}" for m in range(1, 13)],
            "time": ["00:00"],
            "area": [n, w, s, e],
            "grid": [grid, grid],
            "data_format": "netcdf",
            "download_format": "unarchived",
        },
        target=str(target),
    )
    return target


def open_any(path):
    """Abre un .nc o un .zip con varios .nc (Copernicus separa variables acumuladas como ssrd).
    Opens a .nc or a .zip holding several .nc files (Copernicus splits accumulated variables like ssrd)."""
    path = Path(path)
    if zipfile.is_zipfile(path):
        folder = path.with_suffix(".parts")
        with zipfile.ZipFile(path) as z:
            z.extractall(folder)
        parts = [xr.open_dataset(f) for f in sorted(folder.glob("*.nc"))]
    else:
        parts = [xr.open_dataset(path)]
    # ssrd llega fechado a las 06:00 y el resto a las 00:00: llevar todo al inicio del mes
    # ssrd is stamped 06:00 and the rest 00:00: move everything to the start of the month
    fixed = []
    for d in parts:
        t = "valid_time" if "valid_time" in d.dims else "time"
        fixed.append(d.assign_coords({t: d[t].values.astype("datetime64[M]").astype("datetime64[ns]")}))
    return xr.merge(fixed, compat="override", join="outer")


def to_json(ds, names, grid):
    tdim = "valid_time" if "valid_time" in ds.dims else "time"
    ds = ds.rename({tdim: "time", "latitude": "lat", "longitude": "lon"})
    for extra in ("expver", "number"):
        if extra in ds.dims:
            ds = ds.isel({extra: 0})
    ds = ds.sortby("lat", ascending=False).sortby("lon").sortby("time")

    # Si Copernicus no cambió la resolución, promediar aquí / if Copernicus did not regrid, average here
    step = abs(float(ds.lat[1] - ds.lat[0]))
    factor = round(grid / step)
    if factor > 1:
        ds = ds.coarsen(lat=factor, lon=factor, boundary="trim").mean()

    lat, lon = ds.lat.values, ds.lon.values
    out = {
        "source": "ERA5 monthly means, Copernicus Climate Change Service (C3S), CC-BY 4.0",
        "times": [str(t)[:7] for t in ds.time.values.astype("datetime64[M]")],
        "nx": int(lon.size), "ny": int(lat.size),
        "lon0": round(float(lon[0]), 4), "lat0": round(float(lat[0]), 4),
        "dlon": round(float(lon[1] - lon[0]), 4), "dlat": round(float(lat[1] - lat[0]), 4),
    }
    for k in names:
        nc = NC_NAMES[k]
        if nc not in ds:
            raise SystemExit(f"El archivo no tiene {nc} / the file has no {nc}")
        a = ds[nc].values.astype("float64")
        if k == "ssrd":
            a = a / 86400.0  # J/m² por día -> W/m² / J/m² per day -> W/m²
        a = np.round(a, DECIMALS[k])
        out[k] = [[None if math.isnan(x) else x for x in frame.ravel().tolist()] for frame in a]
    return out


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--region", choices=REGIONS, default="amazon")
    p.add_argument("--years", default="2005-2024", help="p. ej. / e.g. 2005-2024 o / or 2023")
    p.add_argument("--grid", type=float, default=1.0,
                   help="resolución en grados (0.25 = nativa, archivos grandes) / resolution in degrees")
    p.add_argument("--vars", default="u,v,tcc,ssrd",
                   help="variables: u,v (obligatorias / required), tcc, ssrd")
    p.add_argument("--from-file", help="convertir un NetCDF ya descargado / convert an existing NetCDF")
    p.add_argument("--out", help="archivo JSON de salida / output JSON file")
    a = p.parse_args()

    names = [x.strip() for x in a.vars.split(",") if x.strip()]
    bad = [x for x in names if x not in VARIABLES]
    if bad:
        raise SystemExit(f"Variables desconocidas / unknown variables: {bad}")
    if "u" not in names or "v" not in names:
        raise SystemExit("La página necesita u y v / the page needs u and v")
    y0, y1 = parse_years(a.years)
    OUT.mkdir(parents=True, exist_ok=True)

    src = Path(a.from_file) if a.from_file else download(a.region, y0, y1, a.grid, names)
    data = to_json(open_any(src), names, a.grid)
    dest = Path(a.out) if a.out else OUT / f"era5_{a.region}_{data['times'][0][:4]}-{data['times'][-1][:4]}.json"
    dest.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    print(f"Listo / done: {dest} ({dest.stat().st_size / 1e6:.1f} MB, {len(data['times'])} meses, "
          f"rejilla {data['nx']}×{data['ny']}, variables {', '.join(names)})")


if __name__ == "__main__":
    main()
