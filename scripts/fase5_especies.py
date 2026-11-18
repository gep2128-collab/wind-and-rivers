"""Fase 5: especies registradas en cada zona de estudio → data/public/especies.js
Phase 5: species recorded in each study area.

Fuente: GBIF.org, búsqueda de ocurrencias por polígono (registros con coordenadas, presentes).
Cuenta especies distintas (no registros) por grupo, y cuántas de ellas están en categorías
amenazadas de la Lista Roja de la UICN (CR, EN, VU), tal como GBIF las asocia a cada especie.
Las categorías de la UICN son de uso libre (Términos UICN §3); no se usan polígonos ni otros datos UICN.

Uso / usage:  .venv/Scripts/python scripts/fase5_especies.py
"""
import json
from datetime import date
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
API = "https://api.gbif.org/v1/occurrence/search"
REGIONS = {"amazon": (-82, -21, -43, 6), "borneo": (108, -5, 120, 8)}  # = ZONES en js/app.js
GROUPS = {  # nombre: filtro GBIF
    "plants": {"kingdomKey": 6}, "animals": {"kingdomKey": 1},
    "mammals": {"classKey": 359}, "birds": {"classKey": 212}, "amphibians": {"classKey": 131},
}
THREAT = ["CR", "EN", "VU"]


def wkt(b):
    w, s, e, n = b
    return f"POLYGON(({w} {s},{e} {s},{e} {n},{w} {n},{w} {s}))"


def species(params):
    """Número de especies distintas (faceta speciesKey) y de registros."""
    p = dict(params, hasCoordinate="true", occurrenceStatus="PRESENT", limit=0, facet="speciesKey",
             facetLimit=200000)
    r = requests.get(API, params=p, timeout=600)
    r.raise_for_status()
    j = r.json()
    return (len(j["facets"][0]["counts"]) if j.get("facets") else 0), j["count"]


def main():
    out = {"source": f"GBIF.org occurrence search ({date.today().isoformat()}): species with georeferenced, "
                     "present records inside each study box; threatened = IUCN Red List category CR, EN or VU "
                     "as linked by GBIF",
           "regions": {}}
    for r, b in REGIONS.items():
        g = {}
        for name, flt in GROUPS.items():
            base = dict(flt, geometry=wkt(b))
            n, recs = species(base)
            thr, _ = species(dict(base, iucnRedListCategory=THREAT))
            g[name] = {"species": n, "records": recs, "threatened": thr,
                       "threatened_pct": round(100 * thr / n, 1) if n else 0}
            print(f"{r} {name}: {n:,} especies ({recs:,} registros), {thr:,} amenazadas ({g[name]['threatened_pct']}%)",
                  flush=True)
        out["regions"][r] = g
    f = ROOT / "data" / "public" / "especies.js"
    f.write_text("// Generado por scripts/fase5_especies.py. Datos: GBIF.org; categorías: Lista Roja UICN\n"
                 f"window.ESPECIES={json.dumps(out, ensure_ascii=False)};\n", encoding="utf-8")
    print("Listo.")


if __name__ == "__main__":
    main()
