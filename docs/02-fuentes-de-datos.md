# Reporte 1: disponibilidad de datos · Report 1: data availability

*18 nov 2026 · Primera búsqueda / first search.* Los enlaces se verificaron con búsquedas web el 18 nov 2026; los marcados ⚠️ no se pudieron confirmar directamente y hay que abrirlos antes de automatizar descargas. *Links were checked with web searches on 18 Nov 2026; those marked ⚠️ could not be confirmed directly and should be opened before scripting downloads.*

Además se probó cada enlace del catálogo de forma automática: 40 de 48 respondieron bien. ENFEN, GEOBOSQUES, IUCN e IPCC Atlas bloquean robots (error 403) pero abren en el navegador; ANA, LandMark, la API de GFW e IGP no respondieron desde aquí. *Every catalogue link was also tested automatically: 40 of 48 responded. ENFEN, GEOBOSQUES, IUCN and the IPCC Atlas block bots (403) but open in a browser; ANA, LandMark, the GFW Data API and IGP did not respond from here.*

La lista completa de fuentes en formato tabla está en [data/catalogo-de-fuentes.csv](../data/catalogo-de-fuentes.csv). El esquema de la base de datos está en [data/esquema-base-de-datos.sql](../data/esquema-base-de-datos.sql).

---

## Español

### Resumen: ¿se puede conseguir todo?

| # | Lo que quieres mostrar | ¿Hay datos? | Comentario |
|---|---|---|---|
| 1 | Temperatura superficial del mar con colorimetría | ✅ Sí, alta calidad | Grillas diarias y mensuales, gratis, desde 1981. |
| 2 | Movimiento del aire y su temperatura | ✅ Sí | ERA5 (el proyecto ya lo usa). |
| 3 | Nubosidad y precipitación | ✅ Sí | ERA5, GPM IMERG, CHIRPS y PISCO (Perú). |
| 4 | Impacto de El Niño en Lima | ✅ Sí, con limitaciones | Índices ICEN/ONI y reanálisis completos; estaciones SENAMHI con huecos. |
| 5 | Incendios en Amazonía y Borneo | ✅ Sí, alta calidad | Focos diarios (FIRMS) y área quemada mensual (MODIS, GFED5, MapBiomas). |
| 6 | Fórmula de propagación del fuego | ✅ Sí | Rothermel (velocidad) + autómata celular (Alexandridis). Ver más abajo. |
| 7 | % de flora y fauna afectada y top 5 | 🟡 Derivable | No existe una base "especies afectadas por incendio": se calcula cruzando áreas quemadas con mapas de distribución (IUCN, BIEN, GBIF). |
| 8 | Comunidades humanas afectadas | 🟡 Derivable | Territorios indígenas (RAISG, LandMark) + población (WorldPop/GHSL). |
| 9 | CO₂ de los incendios | ✅ Sí | GFED5 y CAMS GFAS dan emisiones por celda y mes. |
| 10 | Oxígeno producido por los bosques | 🟡 Estimación | No se mide directamente. Se estima desde la productividad (MODIS GPP/NPP). Ver advertencia. |
| 11 | Negocios/industrias sobre zonas quemadas | 🟠 Parcial | No hay una base global. Se aproxima con cambio de uso del suelo, concesiones, plantas industriales y OpenStreetMap. |
| 12 | Proyección a 20 años | 🟡 Escenarios | CMIP6 da rangos plausibles; nadie puede predecir en qué años caerá El Niño. |

**Conclusión:** el proyecto es viable. Los puntos 1–6 y 9 tienen datos abiertos y listos. Los puntos 7, 8 y 10 se calculan cruzando capas (es trabajo de procesamiento, no de búsqueda). El punto 11 es el más débil y conviene limitarlo a casos que sí tengan datos: plantaciones de palma y pulpa en Borneo, y soya, ganado y minería en la Amazonía brasileña y peruana.

### 1. Océano: temperatura superficial del mar (TSM / SST) y El Niño

| Fuente | Qué da | Enlace |
|---|---|---|
| NOAA OISST v2.1 | TSM diaria 0.25°, 1981–hoy, y anomalías | [NCEI](https://www.ncei.noaa.gov/products/optimum-interpolation-sst) · [ERDDAP (recortes por región, CSV/NetCDF/JSON)](https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncdcOisst21Agg_LonPM180.html) · [Data.gov](https://catalog.data.gov/dataset/noaa-0-25-degree-daily-optimum-interpolation-sea-surface-temperature-oisst-version-2-1) |
| NOAA ERSST v5 | TSM mensual 2°, para series largas | [NCEI ERSST](https://www.ncei.noaa.gov/products/extended-reconstructed-sst) |
| Índices Niño (ONI, Niño 1+2, Niño 3.4) | Series mensuales en texto | [ONI (CPC)](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/ensostuff/ONI_v5.php) · [ONI (texto)](https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt) · [Índices Niño (texto)](https://www.cpc.ncep.noaa.gov/data/indices/sstoi.indices) |
| ICEN (Índice Costero El Niño) — Perú | Índice oficial para El Niño Costero | [ENFEN](https://enfen.imarpe.gob.pe/) · [Datos ICEN IGP (enlace antiguo) ⚠️](http://www.met.igp.gob.pe/datos/icen.txt) |
| Visualización de referencia | Mapas diarios de TSM | [Climate Reanalyzer](https://climatereanalyzer.org/clim/sst_daily) |

**Para la colorimetría:** usa la **anomalía** (TSM − climatología 1991–2020) con una escala divergente azul–blanco–rojo centrada en 0 °C, y la TSM absoluta con una escala secuencial. Umbrales útiles: ONI ≥ +0.5 °C durante 5 trimestres = El Niño; ICEN > +0.4 = condición cálida costera (ver notas técnicas ENFEN).

### 2–3. Atmósfera: viento, temperatura del aire, nubes y lluvia

| Fuente | Variables | Enlace |
|---|---|---|
| ERA5 mensual (Copernicus) | Viento u/v a 10 m y en altura, temperatura 2 m, nubosidad total (tcc), precipitación, radiación | [CDS ERA5 mensual](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels-monthly-means) · [API](https://cds.climate.copernicus.eu/how-to-api) |
| NASA GPM IMERG | Precipitación cada 30 min / diaria / mensual, 0.1° | [GES DISC](https://gpm.nasa.gov/data/directory) |
| CHIRPS | Precipitación diaria 0.05°, 1981–hoy (buena en trópicos) | [CHC UCSB](https://www.chc.ucsb.edu/data/chirps) |
| PISCO (SENAMHI) | Precipitación y temperatura en grilla para Perú | [IRI Data Library ⚠️](https://iridl.ldeo.columbia.edu/SOURCES/.SENAMHI/.HSR/.PISCO/) |
| SENAMHI estaciones | Observaciones diarias por estación (Lima: Campo de Marte, Callao, Ñaña…) | [Descarga de datos](https://www.senamhi.gob.pe/?&p=descarga-datos-hidrometeorologicos) · [Estaciones](https://www.senamhi.gob.pe/?&p=estaciones) |
| MODIS nubes | Fracción de nubes observada por satélite | [NASA Earthdata MOD08_M3](https://ladsweb.modaps.eosdis.nasa.gov/missions-and-measurements/products/MOD08_M3) |

El proyecto ya lee archivos JSON con `u`, `v`, `ssrd` y `tcc` de ERA5. Basta con añadir `t2m` (temperatura) y `tp` (precipitación) al mismo formato.

### 4. Impactos en Lima

| Fuente | Qué da | Enlace |
|---|---|---|
| ENFEN comunicados oficiales | Estado de alerta mes a mes (2005–hoy) | [ENFEN](https://enfen.imarpe.gob.pe/) |
| DesInventar / SINPAD (INDECI) | Emergencias registradas: lluvias, huaicos, inundaciones | [DesInventar Perú](https://www.desinventar.net/) · [SINPAD](https://sinpad.indeci.gob.pe/) ⚠️ |
| ANA SNIRH | Caudales de ríos Rímac, Chillón y Lurín | [SNIRH](http://snirh.ana.gob.pe/visors2/) |

### 5. Incendios: Amazonía y Borneo

| Fuente | Qué da | Enlace |
|---|---|---|
| NASA FIRMS (MODIS y VIIRS) | Focos de calor diarios con potencia radiativa (FRP), 2000–hoy | [Descarga por región](https://firms.modaps.eosdis.nasa.gov/download/) · [API](https://firms.modaps.eosdis.nasa.gov/api/) |
| MODIS MCD64A1 | Área quemada mensual 500 m | [LP DAAC](https://lpdaac.usgs.gov/products/mcd64a1v061/) |
| GFED5 | Área quemada y emisiones (CO₂, CO, CH₄, PM2.5) por mes | [globalfiredata.org](https://globalfiredata.org/data.html) · [Zenodo](https://zenodo.org/records/16794692) |
| Global Forest Watch | Pérdida de bosque (Hansen) y pérdida por incendio | [GFW Data API](https://data-api.globalforestwatch.org/dataset/umd_tree_cover_loss) · [Mapa GFW](https://www.globalforestwatch.org/map/) |
| MapBiomas Fogo (Brasil) | Cicatrices de fuego anuales y mensuales 1985–2024 | [MapBiomas Fogo](https://brasil.mapbiomas.org/en/mapbiomas-fogo/) · [Plataforma y descargas](https://plataforma.brasil.mapbiomas.org/fogo) |
| MapBiomas Amazonía (RAISG) | Cobertura y uso del suelo de toda la Amazonía | [amazonia.mapbiomas.org](https://amazonia.mapbiomas.org/) |
| INPE Queimadas | Focos y área quemada en Brasil | [TerraBrasilis Queimadas](https://terrabrasilis.dpi.inpe.br/queimadas/portal/) |
| GEOBOSQUES (MINAM, Perú) | Pérdida de bosque y alertas en la Amazonía peruana | [GEOBOSQUES](https://geobosques.minam.gob.pe/) |
| GWIS (Copernicus/JRC) | Estadísticas de incendios por país y peligro de incendio | [GWIS](https://gwis.jrc.ec.europa.eu/) |
| Índice de peligro de incendio (FWI) | Índice canadiense FWI diario desde ERA5, 1940–hoy | [EWDS cems-fire-historical](https://ewds.climate.copernicus.eu/datasets/cems-fire-historical-v1) |
| Nusantara Atlas | Deforestación, fuego y concesiones en Borneo | [nusantara-atlas.org](https://nusantara-atlas.org/about/) |

### 6. Fórmula de propagación del fuego

Recomiendo **dos capas**: Rothermel calcula *qué tan rápido* avanza el fuego, y un autómata celular decide *hacia qué celdas* salta. Ambos corren bien en el navegador.

**a) Velocidad de avance — Rothermel (1972)**

```
R = I_R · ξ · (1 + φ_w + φ_s) / (ρ_b · ε · Q_ig)
```

- `R`: velocidad de avance (m/min)
- `I_R`: intensidad de reacción (depende del combustible y su humedad)
- `ξ`: fracción de calor que se propaga
- `φ_w`: factor de viento; `φ_s` = 5.275 · β^-0.3 · tan²(pendiente)
- `ρ_b · ε · Q_ig`: calor necesario para encender el combustible (densidad, eficiencia, calor de ignición, que sube con la humedad)

Parámetros de combustible: modelos estándar de Scott & Burgan (2005), [USDA RMRS-GTR-153](https://www.fs.usda.gov/research/treesearch/9521). Implementación de referencia: [Andrews 2018, RMRS-GTR-371](https://www.fs.usda.gov/research/treesearch/55928).

**b) Dirección y forma — autómata celular de Alexandridis et al. (2008)**

Cada celda del mapa puede estar: sin combustible, sin quemar, ardiendo o quemada. Una celda que arde enciende a cada vecina (8 vecinas) con probabilidad:

```
p_quema = p_h · (1 + p_veg) · (1 + p_den) · p_w · p_s
p_w = exp(c1·V) · exp(c2·V·(cos θ − 1))     ← viento (V en m/s, θ = ángulo viento–dirección)
p_s = exp(a · θ_s)                          ← pendiente (θ_s en grados)
```

Valores calibrados en el artículo original: `p_h = 0.58`, `a = 0.078`, `c1 = 0.045`, `c2 = 0.131`. `p_veg` y `p_den` dependen del tipo y densidad de la vegetación (por ejemplo, de MapBiomas o ESA WorldCover). Para tu proyecto añade un factor de **humedad/temporada**, por ejemplo escalar `p_h` con el índice FWI o con la lluvia de los últimos 30 días: así el mismo punto arde mucho en un septiembre seco de año El Niño y casi nada en la temporada de lluvias.

Referencias: [Alexandridis et al. 2008, *Applied Mathematics and Computation*](https://doi.org/10.1016/j.amc.2008.06.046) · [Alexandridis et al. 2011, *Int. J. Wildland Fire*](https://doi.org/10.1071/WF09119) · [Revisión de autómatas celulares probabilísticos (arXiv 2403.08817)](https://arxiv.org/pdf/2403.08817) · [Explicación práctica](https://wh-computational-geography.pages.dev/atmospheric-hazards/fire-spread-modeling)

**Forma elíptica (opcional):** con viento, el incendio tiende a una elipse de razón largo/ancho `LB = 0.936·e^(0.2566·U) + 0.461·e^(−0.1548·U) − 0.397` (U = viento en mph; Anderson 1983).

**Advertencia tropical:** el bosque húmedo intacto casi no propaga fuego; arde cuando está degradado o tras sequía. El modelo debe partir con probabilidades bajas en bosque cerrado y altas en bordes, pastos y turberas de Borneo.

### 7–8. Especies y comunidades afectadas

No existe una base de datos de "especies afectadas por incendios". Se calcula así:

1. Tomar el área quemada (real o simulada).
2. Cruzarla con los mapas de distribución de cada especie.
3. `% afectado = área de distribución quemada / área de distribución total`.
4. **Top 5** = especies con mayor % afectado, ponderado por su categoría de amenaza IUCN (CR > EN > VU…) o por endemismo.

| Fuente | Qué da | Enlace |
|---|---|---|
| IUCN Red List — datos espaciales | Polígonos de distribución (mamíferos, aves vía BirdLife, anfibios, reptiles, algunas plantas). Requiere cuenta gratuita; uso no comercial | [Descargas espaciales](https://www.iucnredlist.org/resources/spatial-data-download) · [API](https://api.iucnredlist.org/) |
| BirdLife | Distribución de aves | [Datazone](https://datazone.birdlife.org/contact-us/request-our-data) |
| BIEN | Mapas de distribución de plantas de América (útil para flora amazónica) | [BIEN](https://bien.nceas.ucsb.edu/bien/) |
| GBIF | Registros de ocurrencia de flora y fauna (también Borneo) | [API de descargas](https://techdocs.gbif.org/en/data-use/api-downloads) · [Referencia API](https://techdocs.gbif.org/en/openapi/) |
| RAISG | Territorios indígenas y áreas protegidas en la Amazonía | [Datos cartográficos](https://www.amazoniasocioambiental.org/en/maps/) |
| LandMark | Tierras indígenas y comunitarias del mundo (incluye Borneo) | [LandMark](https://www.landmarkmap.org/) |
| WDPA / Protected Planet | Áreas protegidas | [Protected Planet](https://www.protectedplanet.net/en/thematic-areas/wdpa) |
| WorldPop / GHSL | Población por celda de 100 m / 1 km | [WorldPop](https://hub.worldpop.org/) · [GHSL](https://human-settlement.emergency.copernicus.eu/) |

**Flora en Borneo:** hay pocos mapas de distribución; habrá que usar puntos GBIF y construir áreas aproximadas.

### 9–10. CO₂ de los incendios y oxígeno del bosque

**CO₂:** GFED5 y [CAMS GFAS](https://ads.atmosphere.copernicus.eu/datasets/cams-global-fire-emissions-gfas) dan emisiones por celda. Para la simulación usa la fórmula de Seiler y Crutzen (1980):

```
E_CO2 = Área_quemada × Carga_de_combustible × Fracción_quemada × Factor_emisión
```

Factor de emisión de bosque tropical ≈ 1 600 g CO₂ por kg de materia seca (Andreae 2019, [ACP 19:8523](https://doi.org/10.5194/acp-19-8523-2019)). GFED5 estima ~3.4 Pg C al año de emisiones globales por fuego (2002–2022) ([van der Werf et al. 2025](https://doi.org/10.1038/s41597-025-06127-w)).

**Oxígeno:** no se mide por satélite. Se estima por estequiometría de la fotosíntesis: cada gramo de carbono fijado libera 32/12 ≈ **2.67 g de O₂**. Fuente de productividad: [MODIS MOD17A3HGF (NPP anual)](https://lpdaac.usgs.gov/products/mod17a3hgfv061/) y [MOD17A2H (GPP 8 días)](https://lpdaac.usgs.gov/products/mod17a2hv061/).

⚠️ **Advertencia importante para la página:** un bosque maduro consume casi todo el O₂ que produce (respiración de plantas, animales y suelo). Su producción **neta** de oxígeno es cercana a cero; la idea de "pulmón del planeta" es engañosa. Lo honesto es mostrar el **O₂ bruto producido (desde NPP)** junto al **CO₂ que el bosque deja de capturar** tras quemarse, y aclararlo.

### 11. Negocios e industrias sobre zonas quemadas

No hay una base global. La aproximación más sólida:

1. Cruzar las cicatrices de fuego (MapBiomas Fogo, MCD64A1) con el uso del suelo de años posteriores (MapBiomas): **quemado → pasto, soya, palma, minería, urbano**.
2. Sumar capas de actividades económicas con ubicación:

| Fuente | Qué da | Enlace |
|---|---|---|
| GFW concesiones de palma, madera y pulpa | Polígonos de concesiones en Indonesia y Malasia | [GFW Open Data](https://data.globalforestwatch.org/) |
| Universal Mill List | Ubicación de plantas extractoras de palma | [GFW / Trase](https://data.globalforestwatch.org/) ⚠️ |
| Atlas de Borneo (CIFOR) | Plantaciones industriales y molinos, descarga gratuita | [CIFOR Atlas](https://atlas.cifor.org/borneo/) ⚠️ |
| Trase | Cadenas de suministro (soya, ganado, palma, pulpa) y deforestación | [Trase open data](https://trase.earth/open-data) |
| RAISG minería y petróleo | Bloques petroleros, minería legal e ilegal | [RAISG mapas](https://www.amazoniasocioambiental.org/en/maps/) · [WRI ArcGIS](https://gis.wri.org/server/rest/services/Amazon_Mining) |
| SICAR (Brasil) | Registro de propiedades rurales (CAR) | [SICAR](https://consultapublica.car.gov.br/publico/imoveis/index) |
| CNPJ Receita Federal (Brasil) | Registro de empresas con dirección (hay que geocodificar) | [Dados abertos CNPJ](https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-da-pessoa-juridica---cnpj) |
| OpenStreetMap | Zonas industriales, minas, plantas, edificios | [Overpass Turbo](https://overpass-turbo.eu/) · [Geofabrik](https://download.geofabrik.de/) |

Para Perú (Amazonía) y Malasia los registros de empresas con coordenadas son limitados; OSM y las concesiones son la mejor opción.

### 12. Los próximos 20 años (2026–2045)

| Fuente | Qué da | Enlace |
|---|---|---|
| CMIP6 (Copernicus) | Proyecciones mensuales de TSM, temperatura, lluvia, viento por escenario SSP | [CDS projections-cmip6](https://cds.climate.copernicus.eu/datasets/projections-cmip6) |
| NASA NEX-GDDP-CMIP6 | Proyecciones diarias a 0.25° (más detalle regional) | [NCCS](https://www.nccs.nasa.gov/services/data-collections/land-based-products/nex-gddp-cmip6) · [AWS](https://registry.opendata.aws/nex-gddp-cmip6/) |
| IPCC Atlas interactivo | Cambios proyectados por región | [IPCC Atlas](https://interactive-atlas.ipcc.ch/) |

Recomendación: mostrar **escenarios** (SSP2-4.5 y SSP5-8.5) y un "El Niño fuerte hipotético" (por ejemplo, aplicar las anomalías de 2015–16 o 2023–24 sobre el clima proyectado de 2035). Ningún modelo predice en qué año exacto ocurrirá El Niño a 20 años.

### Próximos pasos

1. Crear cuentas gratuitas: Copernicus CDS, NASA Earthdata, FIRMS (MAP_KEY), IUCN Red List, GBIF.
2. Descargar primero lo más fácil y valioso: índices ONI/ICEN, ERA5 mensual (añadir `t2m`, `tp`, `sst`), OISST mensual, FIRMS y GFED5.
3. Montar la base de datos ([data/esquema-base-de-datos.sql](../data/esquema-base-de-datos.sql)) y escribir los scripts de conversión (incluye el `era5_to_json.py` que la página ya menciona).
4. Prototipo del simulador de incendio en una región pequeña (por ejemplo, Madre de Dios o Kalimantan Central).

---

## English

### Summary: can we get everything?

| # | What you want to show | Data? | Note |
|---|---|---|---|
| 1 | Sea surface temperature with a colour scale | ✅ Yes, high quality | Free daily and monthly grids since 1981. |
| 2 | Air movement and air temperature | ✅ Yes | ERA5 (the project already uses it). |
| 3 | Cloud cover and precipitation | ✅ Yes | ERA5, GPM IMERG, CHIRPS and PISCO (Peru). |
| 4 | El Niño impact on Lima | ✅ Yes, with limits | Complete ICEN/ONI indices and reanalysis; SENAMHI stations have gaps. |
| 5 | Fires in the Amazon and Borneo | ✅ Yes, high quality | Daily hotspots (FIRMS) and monthly burned area (MODIS, GFED5, MapBiomas). |
| 6 | Fire spread formula | ✅ Yes | Rothermel (speed) + cellular automaton (Alexandridis). See below. |
| 7 | % of flora and fauna affected, and top 5 | 🟡 Derived | No "species affected by fire" database exists: it is computed by overlaying burned area on range maps (IUCN, BIEN, GBIF). |
| 8 | Human communities affected | 🟡 Derived | Indigenous lands (RAISG, LandMark) + population (WorldPop/GHSL). |
| 9 | CO₂ from fires | ✅ Yes | GFED5 and CAMS GFAS give emissions per cell and month. |
| 10 | Oxygen produced by forests | 🟡 Estimate | Not measured directly. Estimated from productivity (MODIS GPP/NPP). See caveat. |
| 11 | Businesses/industries on burned land | 🟠 Partial | No global database. Approximated with land-use change, concessions, mills and OpenStreetMap. |
| 12 | 20-year projection | 🟡 Scenarios | CMIP6 gives plausible ranges; nobody can predict which years El Niño will hit. |

**Conclusion:** the project is feasible. Items 1–6 and 9 have open, ready-to-use data. Items 7, 8 and 10 are computed by overlaying layers (processing work, not a data search). Item 11 is the weakest; limit it to cases that do have data: palm-oil and pulp plantations in Borneo, and soy, cattle and mining in the Brazilian and Peruvian Amazon.

### Sources by topic

The source tables in the Spanish section above apply as-is (the links are the same). Key points in English:

**Ocean (1).** NOAA OISST v2.1 is the main SST grid (daily, 0.25°, 1981–present); ERDDAP lets you cut regions and export CSV/NetCDF/JSON. ENSO indices: ONI and Niño 1+2 / 3.4 from NOAA CPC, and Peru's ICEN from ENFEN/IGP. For the colour scale, use the **anomaly** (SST minus the 1991–2020 climatology) on a diverging blue–white–red scale centred at 0 °C, and absolute SST on a sequential scale.

**Atmosphere (2–3).** ERA5 monthly means give wind (u/v), 2 m temperature, total cloud cover and precipitation; the page already reads `u`, `v`, `ssrd` and `tcc`, so add `t2m` and `tp` in the same format. GPM IMERG and CHIRPS for rain; PISCO and SENAMHI stations for Peru.

**Lima impacts (4).** ENFEN official statements (monthly alert status), DesInventar/SINPAD for recorded emergencies, ANA SNIRH for river flows.

**Fire (5).** NASA FIRMS (daily hotspots with FRP), MODIS MCD64A1 (monthly burned area), GFED5 (burned area and emissions), Global Forest Watch (Hansen tree cover loss, including loss from fire), MapBiomas Fogo and MapBiomas Amazonía, INPE Queimadas, Peru's GEOBOSQUES, GWIS, the ERA5-based Fire Weather Index on the CDS, and Nusantara Atlas for Borneo.

**Fire spread (6).** Use two layers: Rothermel (1972) gives *how fast* the fire advances, `R = I_R·ξ·(1 + φ_w + φ_s) / (ρ_b·ε·Q_ig)`, with Scott & Burgan fuel models; an Alexandridis et al. (2008) cellular automaton decides *which cells* it jumps to, `p_burn = p_h·(1+p_veg)·(1+p_den)·p_w·p_s`, with `p_w = exp(c1·V)·exp(c2·V·(cos θ − 1))` and `p_s = exp(a·θ_s)`; published values `p_h = 0.58`, `a = 0.078`, `c1 = 0.045`, `c2 = 0.131`. Add a moisture/season factor (scale `p_h` by FWI or 30-day rainfall) so the same point burns hard in a dry El Niño September and barely in the wet season. Caveat: intact humid tropical forest hardly carries fire; it burns when degraded or after drought, so start with low probabilities in closed forest and high ones at edges, pastures and Borneo peat.

**Species and communities (7–8).** Overlay burned area on range maps: `% affected = burned range area / total range area`; top 5 = highest % weighted by IUCN threat category or endemism. Sources: IUCN Red List spatial data (free account, non-commercial use), BirdLife, BIEN (American plants), GBIF occurrences (also for Borneo, where plant range maps are scarce), RAISG and LandMark for indigenous and community lands, WDPA for protected areas, WorldPop/GHSL for population.

**CO₂ and O₂ (9–10).** CO₂ from GFED5 or CAMS GFAS; for the simulation use Seiler & Crutzen (1980): `E = burned area × fuel load × combustion completeness × emission factor`, with ≈1,600 g CO₂ per kg dry matter for tropical forest (Andreae 2019). Oxygen is estimated from MODIS NPP/GPP: each gram of carbon fixed releases 32/12 ≈ 2.67 g O₂. **Caveat for the page:** a mature forest consumes nearly all the O₂ it produces through respiration, so its net oxygen output is close to zero and the "lungs of the planet" framing is misleading. Show gross O₂ (from NPP) next to the CO₂ the forest stops absorbing after it burns, and say so.

**Businesses on burned land (11).** No global database. Overlay fire scars with later land use (MapBiomas: burned → pasture, soy, palm, mining, urban), then add located economic activity: GFW concessions (palm, timber, pulp), the Universal Mill List, CIFOR's Borneo Atlas, Trase, RAISG mining and oil, Brazil's SICAR and CNPJ registries (CNPJ needs geocoding), and OpenStreetMap. Peru (Amazon) and Malaysia have few geolocated company registries; OSM and concessions are the best option there.

**Next 20 years (12).** CMIP6 on the CDS and NASA NEX-GDDP-CMIP6 (daily 0.25°). Show **scenarios** (SSP2-4.5 and SSP5-8.5) plus a "hypothetical strong El Niño" (e.g. apply the 2015–16 or 2023–24 anomalies on top of projected 2035 climate). No model can say which exact year El Niño will occur 20 years out.

### Next steps

1. Create free accounts: Copernicus CDS, NASA Earthdata, FIRMS (MAP_KEY), IUCN Red List, GBIF.
2. Download the easiest, highest-value data first: ONI/ICEN indices, ERA5 monthly (add `t2m`, `tp`, `sst`), monthly OISST, FIRMS and GFED5.
3. Set up the database ([data/esquema-base-de-datos.sql](../data/esquema-base-de-datos.sql)) and write the conversion scripts (including the `era5_to_json.py` the page already mentions).
4. Prototype the fire simulator on a small area (e.g. Madre de Dios, Peru, or Central Kalimantan).
