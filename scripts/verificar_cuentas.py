"""Comprueba que cada cuenta de datos funciona, sin mostrar ninguna clave.
Checks that every data account works, without printing any key.

Uso / usage:  .venv/Scripts/python scripts/verificar_cuentas.py
Lee las claves de .env (en la raíz del proyecto). / Reads keys from .env.
"""
from pathlib import Path

import requests
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parent.parent
env = {k: (v or "").strip() for k, v in dotenv_values(ROOT / ".env").items()}
TIMEOUT = 60


def missing(*names):
    faltan = [n for n in names if not env.get(n)]
    return f"falta en .env: {', '.join(faltan)}" if faltan else None


def check_firms():
    if m := missing("FIRMS_MAP_KEY"):
        return False, m
    r = requests.get(
        "https://firms.modaps.eosdis.nasa.gov/mapserver/mapkey_status/",
        params={"MAP_KEY": env["FIRMS_MAP_KEY"]},
        timeout=TIMEOUT,
    )
    ok = r.ok and "transaction_limit" in r.text
    return ok, r.text.strip() if ok else f"clave rechazada (HTTP {r.status_code})"


def check_copernicus(name, url):
    if m := missing("COPERNICUS_KEY"):
        return False, m
    from ecmwf.datastores import Client

    client = Client(url=url, key=env["COPERNICUS_KEY"])
    try:
        client.check_authentication()
    except Exception as e:  # noqa: BLE001
        resp = getattr(e, "response", None)
        if resp is not None and resp.status_code == 403 and "policies" in resp.text:
            return False, f"clave válida, pero falta aceptar las políticas del sitio: entra a {url.removesuffix('/api')} y acéptalas"
        return False, f"clave rechazada en {name}: {type(e).__name__}"
    # Licencias de los datasets del proyecto (ERA5, GFAS, FWI: CC-BY; CMIP6: cmip6-wps)
    required = {"CDS": {"cc-by", "cmip6-wps"}, "ADS": {"cc-by"}, "EWDS": {"cc-by"}}[name]
    try:
        accepted = {l.get("id") for l in client.get_accepted_licences()}
    except Exception:  # noqa: BLE001
        return True, "clave válida; no se pudieron leer las licencias"
    falta = sorted(required - accepted)
    if falta:
        return False, f"clave válida, pero falta aceptar la licencia de dataset: {falta}"
    return True, f"licencias de datasets aceptadas: {sorted(required)}"


def check_earthdata():
    if m := missing("EARTHDATA_TOKEN"):
        return False, m
    import base64
    import json
    import time

    token = env["EARTHDATA_TOKEN"]
    r = requests.get(
        "https://cmr.earthdata.nasa.gov/search/collections.json",
        params={"page_size": 1},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    if not r.ok:
        return False, f"token rechazado (HTTP {r.status_code})"
    try:
        payload = json.loads(base64.urlsafe_b64decode(token.split(".")[1] + "==="))
        days = (payload["exp"] - time.time()) / 86400
        return days > 0, f"token válido, vence en {days:.0f} días (genera otro en urs.earthdata.nasa.gov/profile)"
    except Exception:  # noqa: BLE001
        return True, "token válido"


def check_iucn():
    if m := missing("IUCN_API_TOKEN"):
        return False, m
    r = requests.get(
        "https://api.iucnredlist.org/api/v4/information/api_version",
        headers={"Authorization": f"Bearer {env['IUCN_API_TOKEN']}"},
        timeout=TIMEOUT,
    )
    return r.ok, f"API {r.json().get('api_version', '?')}" if r.ok else f"token rechazado (HTTP {r.status_code})"


def check_gbif():
    if m := missing("GBIF_USER", "GBIF_PASSWORD"):
        return False, m
    user = env["GBIF_USER"]
    if "@" in user:
        return False, "GBIF_USER debe ser tu nombre de usuario de GBIF, no tu correo (lo ves en gbif.org/user/profile)"
    r = requests.get(
        f"https://api.gbif.org/v1/occurrence/download/user/{user}",
        params={"limit": 1},
        auth=(user, env["GBIF_PASSWORD"]),
        timeout=TIMEOUT,
    )
    return r.ok, "usuario y contraseña válidos" if r.ok else f"rechazado (HTTP {r.status_code})"


CHECKS = [
    ("NASA FIRMS", check_firms),
    ("Copernicus CDS (clima)", lambda: check_copernicus("CDS", "https://cds.climate.copernicus.eu/api")),
    ("Copernicus ADS (emisiones)", lambda: check_copernicus("ADS", "https://ads.atmosphere.copernicus.eu/api")),
    ("Copernicus EWDS (peligro de incendio)", lambda: check_copernicus("EWDS", "https://ewds.climate.copernicus.eu/api")),
    ("NASA Earthdata", check_earthdata),
    ("IUCN Red List", check_iucn),
    ("GBIF", check_gbif),
]

if __name__ == "__main__":
    for name, fn in CHECKS:
        try:
            ok, detail = fn()
        except requests.RequestException as e:
            ok, detail = False, f"sin conexión: {type(e).__name__}"
        print(f"{'OK ' if ok else 'XX '} {name}: {detail}")
