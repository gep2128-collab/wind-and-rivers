# Plan de construcción de la web · Website build plan

*v0.1 — 18 nov 2026. Basado solo en datos ya verificados con descargas de prueba (`scripts/probar_acceso_datos.py`).*

---

## 1. Qué datos tenemos hoy

| Tema | Fuente | Estado | Prueba realizada |
|---|---|---|---|
| Índices El Niño | NOAA ONI y Niño 1+2 / 3.4 | ✅ Descargado | 921 meses de ONI (1950–2026) |
| Temperatura del mar | NOAA OISST (ERDDAP) | ✅ Descargado | Niño 1+2, 15 ene 2024: 25.2 °C de media |
| Viento, temperatura, nubes, lluvia, TSM | ERA5 mensual (Copernicus) | ✅ Descargado | Lima, marzo 2023 (ciclón Yaku): 6 variables |
| Focos de incendio | NASA FIRMS (VIIRS) | ✅ Descargado | Borneo, 15 sep 2023: 403 focos |
| Área quemada | MODIS MCD64A1 (Earthdata) | ✅ Disponible | Borneo, sep 2015: 4 teselas |
| Productividad del bosque (para O₂) | MODIS MOD17A3HGF | ✅ Disponible | Amazonía 2022: 21 teselas |
| Emisiones de CO₂ | GFED5.1 (Zenodo, CC BY 4.0) | ✅ Disponible | Solo se usa el archivo **mensual (1.74 GB)**, no el diario (18.4 GB). Ver §2 |
| Peligro de incendio (FWI) | CEMS / EWDS | ✅ Cuenta y licencia OK | Pendiente de descargar |
| Emisiones diarias | CAMS GFAS / ADS | ✅ Cuenta y licencia OK | Pendiente de descargar |
| Flora | GBIF | ✅ Disponible | Plantas con coordenadas: Perú 1.34 M, Indonesia 0.59 M |
| Categoría de especies | IUCN API | ✅ Disponible | Orangután de Borneo: CR (nombre + categoría = uso libre) |
| Aves (distribución) | BirdLife | ⏳ Solicitud en curso | — |
| Mamíferos (distribución) | IUCN | ⏳ Solicitado; en reserva y sin waiver | No se publica nada derivado |

**Dato llamativo del archivo de hoy:** el ONI de ago–oct 2026 es **+2.46 °C** y la anomalía de Niño 1+2 en octubre 2026 es **+5.25 °C**. Hay un **El Niño fuerte en curso**, con calentamiento extremo frente a Perú. La web puede usar 2026 como caso actual.

**Faltan descargas que no requieren cuenta** (se verifican al descargar): MapBiomas (cobertura y cicatrices de fuego), ESA WorldCover, Copernicus DEM (pendiente), RAISG y LandMark (territorios), WorldPop (población).

---

## 2. Arquitectura

```
Fuentes (APIs)  →  scripts Python (.venv)  →  data/raw/        (grande, no se sube)
                                           →  data/restricted/ (licencia restringida, no se sube)
                                           →  data/public/     (JSON ligeros, sí se sube)
                                                    ↓
                    Página web estática (HTML + D3, GitHub Pages)
```

- **Sin servidor:** todo se precalcula en Python y la página solo lee archivos JSON. Así sigue siendo gratis en GitHub Pages.
- **Se reutiliza la página actual** *Wind and rivers*, ya dividida en `index.html`, `css/style.css`, `js/app.js` y `data/land.js` / `data/rivers.js`. Tiene mapa D3, regiones (Mundo, Amazonía, Borneo), años 2005–2024, animación y carga de ERA5. Se amplía a 2005–2026 con capas nuevas; cada sección nueva va en su propio archivo JS.
- **PostGIS queda para más adelante:** `data/esquema-base-de-datos.sql` se usará cuando haya cruces espaciales pesados (especies × área quemada). La v1 funciona con archivos.
- **Archivos pesados (como GFED5):** se descargan a `data/raw/` solo el tiempo necesario, se extraen las variables y regiones que usamos (CO₂ y área quemada en la Amazonía y Borneo, 2005–2026) y se borra el original. Lo que queda en el proyecto pesa unos cientos de KB. Hay 183 GB libres en el disco, así que 1.74 GB temporales no son problema. Si GFED5.1 no llega hasta 2026, los meses faltantes se completan con CAMS GFAS, que se descarga ya recortado por región.
- **Presupuesto de tamaño:** cada JSON público < 5 MB; grillas a 0.5°–1° para el mapa mundial y a 0.1°–0.25° para las regiones.

---

## 3. Secciones de la página (v1)

| # | Sección | Qué ve el usuario | Datos |
|---|---|---|---|
| 1 | **El océano** | Mapa de anomalía de TSM (azul–blanco–rojo) mes a mes, con la línea de tiempo del ONI e ICEN; los años El Niño quedan resaltados | OISST mensual, ONI, Niño 1+2 |
| 2 | **El aire** | Las capas actuales (viento, radiación, nubes) más temperatura a 2 m y lluvia | ERA5 mensual |
| 3 | **Lima** | Panel con series de TSM frente a la costa, temperatura del aire, lluvia y nubosidad frente al ONI; tarjetas para 2015–16, 2017, 2023 (Yaku) y 2026 | ERA5, OISST, índices |
| 4 | **El fuego** | Densidad mensual de focos y área quemada en la Amazonía y Borneo; gráfico de focos frente al ONI con desfase de meses | FIRMS agregado, MCD64A1, GFED5 |
| 5 | **Simulador** | Clic en el mapa → el fuego se expande paso a paso según mes, viento, humedad (FWI), pendiente y vegetación; contador de hectáreas y CO₂ | Autómata celular (Alexandridis) + ERA5/FWI + cobertura + DEM |
| 6 | **Impacto** | CO₂ emitido frente a O₂ bruto del bosque (con la advertencia de que el aporte neto es ~0); top 5 de flora (GBIF); comunidades cercanas; especies emblemáticas solo con nombre y categoría | GFED5, NPP, GBIF, RAISG/LandMark, WorldPop, IUCN (categoría) |
| — | **Créditos y licencias** | Cita de cada fuente con su versión | Checklist de licencias |

**Para la v2** (cuando haya datos o permisos): top 5 de aves (BirdLife), uso del suelo después del fuego (negocios e industrias), escenarios 2026–2045 (CMIP6).

---

## 4. Fases

| Fase | Entregable | Scripts | Salida en `data/public/` | Puerta de cumplimiento |
|---|---|---|---|---|
| **0. Base** ✅ | Cuentas, licencias, entorno aislado, controles de git | `verificar_cuentas.py`, `probar_acceso_datos.py` | — | Hecho |
| **1. El Niño y el océano** | Sección 1 + línea de tiempo | `descargar_indices.py`, `oisst_mensual.py` | `enso.json`, `sst_anom_YYYY.json` | NOAA: citar el producto |
| **2. Aire y Lima** | Secciones 2 y 3; script `era5_to_json.py` (el que la página ya menciona) | `era5_mensual.py`, `era5_to_json.py` | `era5_YYYY.json`, `lima_series.json` | Copernicus: frase de atribución |
| **3. Fuego histórico** | Sección 4 | `firms_agregado.py`, `gfed5_regional.py` | `fuego_mensual.json`, `co2_regional.json` | NASA y GFED5: citar |
| **4. Simulador piloto** | Sección 5 en 2 zonas: Madre de Dios (Perú) y Kalimantan Central (Borneo) | `preparar_combustible.py` (MapBiomas o WorldCover + DEM), `fwi_mensual.py` | `piloto_*.json` (grilla 1 km) | MapBiomas y WorldCover: CC BY |
| **5. Impacto** | Sección 6 | `npp_o2.py`, `gbif_flora.py`, `comunidades.py` | `impacto_*.json` | GBIF: DOI de la descarga; RAISG: según metadatos; IUCN: solo categoría |
| **6. v2** | Aves, uso del suelo posterior, escenarios | — | — | BirdLife: solo derivados; IUCN: waiver |

Orden recomendado: 1 → 2 → 3 → 4 → 5. Cada fase termina con la página funcionando y publicable.

---

## 5. Reglas de trabajo

- Los scripts se ejecutan con `.venv/Scripts/python` (el entorno aislado no toca tu Python general).
- Antes de cada commit: el control `.githooks/pre-commit` bloquea datos crudos y claves, y se revisa el [checklist de licencias](03-licencias-y-cumplimiento.md).
- Los datos crudos se pueden borrar después de generar los JSON; los scripts permiten volver a descargarlos.

## 6. Decisiones tomadas (18 nov 2026)

1. **Idioma:** la página tendrá un botón **ES/EN**. Todos los textos se guardan en un archivo de traducciones (`js/i18n.js`).
2. **Zonas piloto del simulador:** **Madre de Dios** (Perú) y **Kalimantan Central** (Indonesia, Borneo).
3. **Periodo:** **2005–2026**, para incluir el El Niño en curso.

---

## English summary

All accounts and licences are verified, and test downloads worked for ENSO indices, OISST, ERA5, FIRMS, MODIS burned area and NPP, GFED5, GBIF and the IUCN category API. Today's files show a strong El Niño under way (ONI ASO 2026 +2.46 °C; Niño 1+2 October 2026 anomaly +5.25 °C). The site stays static on GitHub Pages: Python scripts precompute small JSON files in `data/public/`, and raw or restricted data never leaves the machine. Decisions: ES/EN button, pilot areas Madre de Dios and Central Kalimantan, period 2005–2026. Only the 1.74 GB monthly GFED5.1 file is used, temporarily, and reduced to a few hundred KB. Build order: (1) ENSO and ocean, (2) air and Lima, (3) historical fire, (4) pilot fire simulator in Madre de Dios and Central Kalimantan, (5) impacts (CO₂ vs O₂, flora from GBIF, communities). Birds (BirdLife), post-fire land use and 2026–2045 CMIP6 scenarios come in v2.
