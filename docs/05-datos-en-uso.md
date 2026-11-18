# Reporte 2: datos en uso y datos excluidos · Report 2: data in use and data left out

*18 nov 2026. Reemplaza la lista amplia del [Reporte 1](02-fuentes-de-datos.md) con lo que la versión 1 de la web usará de verdad. · Narrows [Report 1](02-fuentes-de-datos.md) down to what version 1 of the site will actually use.*

**Leyenda / legend:** ✅ probado con descarga real / tested with a real download · 🔗 enlace verificado / link checked · ⚠️ el sitio bloquea pruebas automáticas, pero abre en el navegador / blocks automated checks, opens in a browser · ⏳ pendiente / pending

---

## Español

### Decisiones que definen esta lista

- **Periodo:** 2005–2026, incluido el El Niño en curso.
- **Zonas piloto del simulador:** Madre de Dios (Perú) y Kalimantan Central (Borneo).
- **Fauna en la v1:** solo aves, cuando llegue la respuesta de BirdLife. Mientras tanto, especies emblemáticas solo con nombre y categoría IUCN.
- **Archivos pesados:** se descargan solo temporalmente, se reducen a lo que usamos y se borran.

### Datos en uso (versión 1)

#### 1. El Niño y el océano

| Dato | Fuente | Para qué | Enlace de extracción | Estado |
|---|---|---|---|---|
| ONI (índice oceánico El Niño) | NOAA CPC | Línea de tiempo y años El Niño/La Niña | [oni.ascii.txt](https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt) | ✅ |
| Niño 1+2 y Niño 3.4 semanales→mensuales (OISST) | NOAA CPC | Calentamiento frente a Perú, hasta el mes pasado | [sstoi.indices](https://www.cpc.ncep.noaa.gov/data/indices/sstoi.indices) | ✅ |
| Niño 1+2 mensual (ERSST v5, clima 1991–2020) | NOAA CPC | Calcular el **ICEN** (El Niño Costero) nosotros mismos: media móvil de 3 meses de la anomalía Niño 1+2, como hace ENFEN | [ersst5.nino.mth.91-20.ascii](https://www.cpc.ncep.noaa.gov/data/indices/ersst5.nino.mth.91-20.ascii) | 🔗 |
| Temperatura del mar en grilla (anomalía mensual) | **ERA5 mensual** (Copernicus, CC BY 4.0), grilla de 2°, 40° N–40° S, base 1991–2020 | Mapa de colores mes a mes (`scripts/fase1_sst.py`). Se usa ERA5 y no OISST porque viene ya promediado por mes y a la resolución que necesitamos | [ERA5 mensual](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels-monthly-means) | ✅ |
| Temperatura del mar diaria (respaldo) | NOAA OISST v2.1 vía ERDDAP | Comprobaciones puntuales | [ERDDAP OISST](https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncdcOisst21Agg_LonPM180.html) | ✅ |

#### 2. Aire y clima regional

| Dato | Fuente | Para qué | Enlace de extracción | Estado |
|---|---|---|---|---|
| Viento (u, v), temperatura 2 m, TSM, nubosidad, lluvia, radiación | ERA5 mensual, Copernicus CDS | Capas del mapa y series de clima de la Amazonía y Borneo | [ERA5 mensual](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels-monthly-means) | ✅ |

#### 3. Fuego

| Dato | Fuente | Para qué | Enlace de extracción | Estado |
|---|---|---|---|---|
| Focos de incendio diarios (VIIRS y MODIS) | NASA FIRMS | Densidad mensual de focos, Amazonía y Borneo | [Descarga por región](https://firms.modaps.eosdis.nasa.gov/download/) · [API](https://firms.modaps.eosdis.nasa.gov/api/) | ✅ |
| Área quemada mensual (500 m) | MODIS MCD64A1, NASA | Hectáreas quemadas por mes | [LP DAAC MCD64A1](https://lpdaac.usgs.gov/products/mcd64a1v061/) | ✅ |
| Emisiones de CO₂ y área quemada | GFED5.1 **mensual** (1.74 GB, temporal) | CO₂ por región y mes | [Zenodo GFED5.1](https://zenodo.org/records/16794692) ⚠️ | ✅ |
| Emisiones diarias | CAMS GFAS, Copernicus ADS | Completar meses recientes si GFED5.1 no llega a 2026 | [CAMS GFAS](https://ads.atmosphere.copernicus.eu/datasets/cams-global-fire-emissions-gfas) | 🔗 cuenta y licencia OK |
| Índice de peligro de incendio (FWI) | CEMS, Copernicus EWDS | Comparar temporadas con y sin El Niño; humedad en el simulador | [CEMS fire historical](https://ewds.climate.copernicus.eu/datasets/cems-fire-historical-v1) | 🔗 cuenta y licencia OK |

#### 4. Simulador (zonas piloto)

| Dato | Fuente | Para qué | Enlace de extracción | Estado |
|---|---|---|---|---|
| Cobertura del suelo (Perú) | MapBiomas Perú | Tipo de vegetación y combustible en Madre de Dios | [peru.mapbiomas.org](https://peru.mapbiomas.org/) | 🔗 |
| Cobertura del suelo (toda la Amazonía) | MapBiomas Amazonía | Respaldo y contexto regional | [amazonia.mapbiomas.org](https://amazonia.mapbiomas.org/) | 🔗 |
| Cobertura del suelo (Borneo) | ESA WorldCover 10 m | Vegetación y combustible en Kalimantan Central | [WorldCover](https://esa-worldcover.org/en/data-access) | 🔗 |
| Relieve y pendiente | Copernicus DEM GLO-30 | Pendiente para el autómata celular | [Copernicus DEM (AWS)](https://registry.opendata.aws/copernicus-dem/) | 🔗 |
| Viento y humedad | ERA5 + FWI | Dirección y probabilidad de propagación | (arriba) | ✅ / 🔗 |

#### 5. Impacto

| Dato | Fuente | Para qué | Enlace de extracción | Estado |
|---|---|---|---|---|
| Productividad primaria neta | MODIS MOD17A3HGF | Estimar O₂ bruto y CO₂ que el bosque captura en un año | [LP DAAC MOD17A3HGF](https://lpdaac.usgs.gov/products/mod17a3hgfv061/) | ✅ |
| Registros de plantas | GBIF | Top 5 de flora en las zonas piloto (solo registros CC0 y CC BY) | [GBIF búsqueda](https://www.gbif.org/occurrence/search) ⚠️ · [API de descargas](https://techdocs.gbif.org/en/data-use/api-downloads) | ✅ |
| Categoría de especies emblemáticas | IUCN Red List API v4 | Nombre y categoría (uso libre); nada más sin waiver | [api.iucnredlist.org](https://api.iucnredlist.org/) | ✅ |
| Territorios indígenas y áreas protegidas (Amazonía) | RAISG | Comunidades cercanas al fuego | [RAISG mapas](https://www.amazoniasocioambiental.org/en/maps/) | 🔗 |
| Tierras indígenas y comunitarias (Borneo) | LandMark | Comunidades en Kalimantan | [landmarkmap.org](https://www.landmarkmap.org/) | ⏳ no respondió hoy |
| Población | WorldPop | Personas cerca del área quemada | [WorldPop](https://hub.worldpop.org/) | 🔗 |

### Datos excluidos por ahora

| Dato | Por qué no está | Qué lo desbloquea |
|---|---|---|
| **Distribución de aves** (BirdLife) | Solicitud en curso, sin respuesta | Aprobación de BirdLife → top 5 de aves (solo resultados derivados) |
| **Distribución de mamíferos** (IUCN) | Solicitado, pero publicar cualquier derivado requiere waiver | Waiver escrito de IUCN (redlist@iucn.org) |
| Anfibios y reptiles (IUCN) | Decisión: reducir volumen de datos | Decisión futura + waiver |
| Uso del suelo después del fuego: concesiones, empresas, industrias (GFW, Trase, CNPJ, SICAR, OpenStreetMap) | Se deja para la v2, por volumen de trabajo | Fase 6 del plan |
| Escenarios 2026–2045 (CMIP6) | Se deja para la v2 (cuenta y licencia ya listas) | Fase 6 del plan |
| GFED5.1 diario (18.4 GB) | No hace falta: basta el mensual | — |
| ICEN oficial (IGP) | El enlace del IGP no respondió | Se calcula con ERSST (arriba); se compara con los comunicados de [ENFEN](https://enfen.imarpe.gob.pe/) ⚠️ |
| Impactos en Lima y la costa (SENAMHI, PISCO, DesInventar, ANA) | Fuera del alcance: el proyecto se centra en la Amazonía y Borneo | — |
| BIEN (plantas), WDPA (áreas protegidas) | Superposición con GBIF y RAISG | Si GBIF no alcanza |

---

## English

### Decisions behind this list

Period 2005–2026, including the current El Niño. Simulator pilot areas: Madre de Dios (Peru) and Central Kalimantan (Borneo). Fauna in v1: birds only, once BirdLife replies; meanwhile, flagship species with name and IUCN category only. Heavy files are downloaded temporarily, reduced to what we use, and deleted.

### Data in use (version 1)

The source links are in the Spanish tables above.

- **El Niño and ocean:** NOAA ONI, OISST-based Niño 1+2 and 3.4 indices, ERSST v5 Niño 1+2 (to compute the Coastal El Niño Index, ICEN, ourselves as a 3-month running mean, as ENFEN does), and ERA5 monthly SST on a 2° grid for the colour map (OISST stays as a backup for spot checks). ✅
- **Air and regional climate:** ERA5 monthly means (wind, 2 m temperature, SST, cloud cover, precipitation, radiation). ✅
- **Fire:** NASA FIRMS hotspots, MODIS MCD64A1 burned area, GFED5.1 monthly emissions (1.74 GB, temporary), CAMS GFAS for recent months if needed, and the CEMS Fire Weather Index to compare seasons with and without El Niño. ✅ / account and licence ready
- **Simulator:** MapBiomas Peru and Amazonia (Madre de Dios), ESA WorldCover (Central Kalimantan), Copernicus DEM for slope, ERA5 and FWI for wind and moisture.
- **Impact:** MODIS NPP (gross O₂ and yearly CO₂ uptake), GBIF plant records (CC0 and CC BY only), IUCN category for flagship species, RAISG and LandMark lands, WorldPop population.

### Data left out for now

- **Bird ranges (BirdLife):** request pending; unlocks the bird top 5.
- **Mammal ranges (IUCN):** requested, but any derived result needs an IUCN waiver.
- **Amphibians and reptiles:** left out to keep data volume low.
- **Post-fire land use and businesses:** moved to v2.
- **CMIP6 2026–2045 scenarios:** moved to v2; account and licence are ready.
- **GFED5.1 daily (18.4 GB):** not needed; the monthly file is enough.
- **Official ICEN (IGP):** link did not respond; computed from ERSST instead and checked against ENFEN statements.
- **Lima and coastal impacts (SENAMHI, PISCO, DesInventar, ANA):** out of scope; the project focuses on the Amazon and Borneo.
- **BIEN, WDPA:** not needed for v1.

---

## Actualización · Update (18 nov 2026, tarde)

| Dato | Fuente | Para qué | Script / archivo | Estado |
|---|---|---|---|---|
| Viento, nubes y radiación de todo el mundo, 2° | ERA5 mensual (Copernicus, CC BY 4.0) | Capas del mapa mundial (antes solo en las zonas de estudio) | `scripts/fase2_global.py` → `data/public/era5/global_YYYY.js` (~0.9 MB/año) | ✅ |
| CO₂ de incendios y área quemada mensual | GFED5.1 hasta 2022 + CAMS GFAS escalado desde 2023 | Recuadros comparativos | `scripts/fase3_gfed.py` → `data/public/co2_regional.js` | ✅ / ⏳ ver recuadros |
| O₂ liberado y CO₂ absorbido al año | MODIS MOD17A3HGF v6.1 (NPP, NASA) — 2015, 2022, 2023 | Recuadros comparativos (pregunta 1) | `scripts/fase5_oxigeno.py` → `data/public/oxigeno.js` | ✅ / ⏳ |
| Especies registradas y % amenazado | GBIF.org (búsqueda por polígono) + categorías de la Lista Roja UICN que GBIF asocia | Recuadros comparativos | `scripts/fase5_especies.py` → `data/public/especies.js` | ✅ |

*Update: world-wide ERA5 at 2° for wind, clouds and radiation; fire CO₂ (GFED5.1/GFAS); yearly O₂ and CO₂ uptake from MODIS NPP; species counts per study area from GBIF with IUCN threat categories. They feed the new "Amazon and Borneo compared" section below the map.*
