"""Prueba que podemos extraer datos reales de cada fuente, con descargas muy pequeñas.
Tests that real data can be extracted from each source, using tiny downloads.

Uso / usage:  python scripts/probar_acceso_datos.py
Guarda las muestras en data/raw/pruebas/ (ignorada por git). No muestra claves.
"""
from pathlib import Path

import requests
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "raw" / "pruebas"
OUT.mkdir(parents=True, exist_ok=True)
env = {k: (v or "").strip() for k, v in dotenv_values(ROOT / ".env").items()}
T = 60

BORNEO = (108.5, -4.5, 119.5, 7.5)          # oeste, sur, este, norte
AMAZON = (-80.0, -20.0, -44.0, 10.0)


def save(name, text):
    (OUT / name).write_text(text, encoding="utf-8")
    return OUT / name


def oni():
    r = requests.get("https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt", timeout=T)
    r.raise_for_status()
    lines = r.text.strip().splitlines()
    save("oni.txt", r.text)
    return f"{len(lines) - 1} meses; último: {lines[-1].split()}"


def nino_indices():
    r = requests.get("https://www.cpc.ncep.noaa.gov/data/indices/sstoi.indices", timeout=T)
    r.raise_for_status()
    lines = r.text.strip().splitlines()
    save("sstoi.indices.txt", r.text)
    return f"{len(lines) - 1} meses (Niño 1+2, 3, 4, 3.4); último: {' '.join(lines[-1].split()[:4])}"


def oisst():
    # Un día, región Niño 1+2 (0–10°S, 90–80°W), una celda cada 1°
    url = ("https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncdcOisst21Agg_LonPM180.csv?"
           "sst[(2024-01-15T12:00:00Z)][(0.0)][(-10.0):4:(0.0)][(-90.0):4:(-80.0)]")
    r = requests.get(url, timeout=T)
    r.raise_for_status()
    rows = r.text.strip().splitlines()[2:]
    vals = [float(x.split(",")[-1]) for x in rows if x.split(",")[-1] not in ("", "NaN")]
    save("oisst_nino12_20240115.csv", r.text)
    return f"{len(vals)} celdas; TSM media Niño 1+2 el 15 ene 2024: {sum(vals) / len(vals):.1f} °C"


def firms():
    key = env.get("FIRMS_MAP_KEY")
    if not key:
        return "falta FIRMS_MAP_KEY"
    bbox = ",".join(map(str, BORNEO))
    url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/VIIRS_SNPP_SP/{bbox}/1/2023-09-15"
    try:
        r = requests.get(url, timeout=T)
    except requests.RequestException as e:
        return f"error de conexión ({type(e).__name__})"
    if not r.ok or not r.text.startswith("latitude"):
        return f"respuesta inesperada (HTTP {r.status_code})"
    n = len(r.text.strip().splitlines()) - 1
    save("firms_borneo_20230915.csv", r.text)
    return f"{n} focos VIIRS en Borneo el 15 sep 2023 (año El Niño)"


def era5():
    key = env.get("COPERNICUS_KEY")
    if not key:
        return "falta COPERNICUS_KEY"
    from ecmwf.datastores import Client

    c = Client(url="https://cds.climate.copernicus.eu/api", key=key)
    target = OUT / "era5_lima_202303.nc"
    c.retrieve(
        "reanalysis-era5-single-levels-monthly-means",
        {
            "product_type": ["monthly_averaged_reanalysis"],
            "variable": ["2m_temperature", "sea_surface_temperature", "total_precipitation",
                         "total_cloud_cover", "10m_u_component_of_wind", "10m_v_component_of_wind"],
            "year": ["2023"], "month": ["03"], "time": ["00:00"],
            "area": [-11, -78, -13, -76],  # norte, oeste, sur, este: Lima
            "data_format": "netcdf",
        },
        target=str(target),
    )
    return f"archivo {target.name} ({target.stat().st_size // 1024} KB) con t2m, sst, tp, tcc, u10, v10 de marzo 2023 (ciclón Yaku)"


def mcd64a1():
    w, s, e, n = BORNEO
    r = requests.get(
        "https://cmr.earthdata.nasa.gov/search/granules.json",
        params={"short_name": "MCD64A1", "version": "061", "bounding_box": f"{w},{s},{e},{n}",
                "temporal": "2015-09-01T00:00:00Z,2015-09-30T23:59:59Z", "page_size": 50},
        headers={"Authorization": f"Bearer {env.get('EARTHDATA_TOKEN', '')}"},
        timeout=T,
    )
    r.raise_for_status()
    g = r.json()["feed"]["entry"]
    return f"{len(g)} teselas de área quemada MODIS para Borneo, sep 2015 (listas para descargar)"


def modis_npp():
    w, s, e, n = AMAZON
    r = requests.get(
        "https://cmr.earthdata.nasa.gov/search/granules.json",
        params={"short_name": "MOD17A3HGF", "version": "061", "bounding_box": f"{w},{s},{e},{n}",
                "temporal": "2022-01-01T00:00:00Z,2022-12-31T23:59:59Z", "page_size": 100},
        timeout=T,
    )
    r.raise_for_status()
    return f"{len(r.json()['feed']['entry'])} teselas de productividad (NPP → O₂) para la Amazonía, 2022"


def gfed5():
    r = requests.get("https://zenodo.org/api/records/16794692", timeout=T)
    r.raise_for_status()
    files = r.json().get("files", [])
    total = sum(f.get("size", 0) for f in files) / 1e9
    return f"{len(files)} archivos en Zenodo ({total:.1f} GB en total); licencia {r.json().get('metadata', {}).get('license', {}).get('id', '?')}"


def gbif_flora():
    counts = {}
    for name, country in [("Perú", "PE"), ("Indonesia", "ID")]:
        r = requests.get("https://api.gbif.org/v1/occurrence/search",
                         params={"kingdomKey": 6, "country": country, "hasCoordinate": "true", "limit": 0},
                         timeout=T)
        r.raise_for_status()
        counts[name] = r.json()["count"]
    return "registros de plantas con coordenadas: " + ", ".join(f"{k} {v:,}" for k, v in counts.items())


def iucn_category():
    tok = env.get("IUCN_API_TOKEN")
    if not tok:
        return "falta IUCN_API_TOKEN"
    r = requests.get("https://api.iucnredlist.org/api/v4/taxa/scientific_name",
                     params={"genus_name": "Pongo", "species_name": "pygmaeus"},
                     headers={"Authorization": f"Bearer {tok}"}, timeout=T)
    r.raise_for_status()
    a = [x for x in r.json().get("assessments", []) if x.get("latest")]
    cat = a[0].get("red_list_category_code") if a else "?"
    return f"orangután de Borneo (Pongo pygmaeus): categoría {cat} (nombre + categoría = uso libre)"


TESTS = [
    ("ONI (NOAA)", oni),
    ("Índices Niño (NOAA)", nino_indices),
    ("TSM OISST (NOAA ERDDAP)", oisst),
    ("Focos de incendio (FIRMS)", firms),
    ("Área quemada MODIS (Earthdata)", mcd64a1),
    ("Productividad MODIS NPP (Earthdata)", modis_npp),
    ("GFED5 emisiones (Zenodo)", gfed5),
    ("Flora (GBIF)", gbif_flora),
    ("Categoría IUCN (API)", iucn_category),
    ("ERA5 clima Lima (Copernicus)", era5),
]

if __name__ == "__main__":
    for name, fn in TESTS:
        try:
            print(f"OK  {name}: {fn()}", flush=True)
        except Exception as e:  # noqa: BLE001
            print(f"XX  {name}: {type(e).__name__}: {str(e)[:150]}", flush=True)
