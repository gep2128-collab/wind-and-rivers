"""Fase 1: índices de El Niño 2005–hoy → data/public/enso.js
Phase 1: El Niño indices 2005–present → data/public/enso.js

Fuentes (NOAA CPC, dominio público):
  ONI (media de 3 meses de la anomalía Niño 3.4, ERSST v5):
      https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt
  Niño 1+2 y Niño 3.4 mensuales (OISST v2.1, clima 1991–2020):
      https://www.cpc.ncep.noaa.gov/data/indices/sstoi.indices

Uso / usage:  .venv/Scripts/python scripts/fase1_indices.py
"""
import json
from datetime import date
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "fase1"
OUT = ROOT / "data" / "public" / "enso.js"
START = 2005
SEAS = ["DJF", "JFM", "FMA", "MAM", "AMJ", "MJJ", "JJA", "JAS", "ASO", "SON", "OND", "NDJ"]


def fetch(url, name):
    RAW.mkdir(parents=True, exist_ok=True)
    r = requests.get(url, timeout=60)
    r.raise_for_status()
    (RAW / name).write_text(r.text, encoding="utf-8")
    return r.text


def parse_oni(text):
    """ONI por mes central de la estación (DJF → enero)."""
    oni = {}
    for line in text.strip().splitlines()[1:]:
        seas, yr, _total, anom = line.split()
        oni[f"{int(yr):04d}-{SEAS.index(seas) + 1:02d}"] = float(anom)
    return oni


def parse_sstoi(text):
    n12, n34 = {}, {}
    for line in text.strip().splitlines()[1:]:
        p = line.split()
        key = f"{int(p[0]):04d}-{int(p[1]):02d}"
        n12[key], n34[key] = float(p[3]), float(p[9])
    return n12, n34


def phases(months, oni):
    """Criterio NOAA: El Niño (La Niña) si ONI ≥ +0.5 (≤ −0.5) en al menos 5 estaciones seguidas.
    Los últimos meses, sin 5 estaciones todavía, se marcan como provisionales."""
    vals = [oni.get(m) for m in months]
    out = [0] * len(vals)
    for sign in (1, -1):
        i = 0
        while i < len(vals):
            if vals[i] is not None and sign * vals[i] >= 0.5:
                j = i
                while j < len(vals) and vals[j] is not None and sign * vals[j] >= 0.5:
                    j += 1
                if j - i >= 5 or j == len(vals) or vals[j] is None:
                    for k in range(i, j):
                        out[k] = sign
                i = j
            else:
                i += 1
    # Meses finales sin ONI publicado todavía: se mantiene la fase del último mes con dato
    for i in range(1, len(vals)):
        if vals[i] is None and all(v is None for v in vals[i:]):
            out[i] = out[i - 1]
    return out


def main():
    oni = parse_oni(fetch("https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt", "oni.txt"))
    n12, n34 = parse_sstoi(fetch("https://www.cpc.ncep.noaa.gov/data/indices/sstoi.indices", "sstoi.indices.txt"))

    last = max(set(oni) | set(n12))
    months, y, m = [], START, 1
    while f"{y:04d}-{m:02d}" <= last:
        months.append(f"{y:04d}-{m:02d}")
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)

    rnd = lambda d: [None if d.get(k) is None else round(d[k], 2) for k in months]
    data = {
        "updated": date.today().isoformat(),
        "months": months,
        "oni": rnd(oni),
        "nino12": rnd(n12),
        "nino34": rnd(n34),
        "phase": phases(months, oni),
        "source": "NOAA Climate Prediction Center: ONI (ERSST v5) and Niño 1+2 / 3.4 indices (OISST v2.1, 1991–2020 base)",
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("// Generado por scripts/fase1_indices.py — no editar a mano\nwindow.ENSO=" +
                   json.dumps(data, separators=(",", ":")) + ";\n", encoding="utf-8")

    ninos = sorted({m[:4] for m, p in zip(months, data["phase"]) if p == 1})
    ninas = sorted({m[:4] for m, p in zip(months, data["phase"]) if p == -1})
    print(f"{OUT.relative_to(ROOT)}: {len(months)} meses ({months[0]} a {months[-1]}), {OUT.stat().st_size // 1024} KB")
    print("Años con El Niño:", ", ".join(ninos))
    print("Años con La Niña:", ", ".join(ninas))
    i = len(months) - 1
    while data["oni"][i] is None:
        i -= 1
    print(f"Último ONI: {months[i]} = {data['oni'][i]:+.2f}; último Niño 1+2: {data['nino12'][-1]}")


if __name__ == "__main__":
    main()
