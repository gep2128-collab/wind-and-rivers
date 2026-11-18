# Licencias y cumplimiento · Licences and compliance

*Se actualiza cada vez que se acepta una licencia nueva o se descarga un dataset. · Updated whenever a licence is accepted or a dataset is downloaded.*

## Reglas generales del proyecto / Project-wide rules

1. **El repositorio y la web son públicos.** Los datos con licencia restrictiva van solo en `data/restricted/` (excluida por `.gitignore`) y nunca se suben a GitHub ni a servicios externos.
2. **Sin uso comercial:** la página no tendrá anuncios, ventas ni nada que genere ingresos.
3. **Cada dato mostrado en la página lleva su cita** (fuente y versión) en una sección de créditos.
4. **Antes de cada commit o publicación** se revisa esta lista.

## Dónde guardar cada dato / Where to store each dataset

| Carpeta | Qué va ahí | ¿Se sube a GitHub? |
|---|---|---|
| `data/restricted/birdlife/` | Archivos originales de BirdLife (tal como llegan) | ❌ Nunca |
| `data/restricted/iucn/` | Polígonos originales de IUCN | ❌ Nunca |
| `data/raw/` | Descargas abiertas pero pesadas (ERA5, OISST, FIRMS, MODIS, GFED5) | ❌ No: pesan demasiado; se vuelven a descargar con scripts |
| `data/public/` | Resultados derivados que la página sí puede mostrar (% afectado, top 5, series, JSON ligeros) | ✅ Sí, tras revisar la lista de abajo |
| `.env` | Claves de API | ❌ Nunca |

**Protección automática:** el hook `.githooks/pre-commit` cancela cualquier commit que incluya `data/restricted/`, `data/raw/`, `.env`, archivos de datos crudos (`.shp`, `.gdb`, `.gpkg`, `.zip`, `.nc`, `.tif`, `.parquet`) o cualquier clave de `.env`. Se activa con `git config core.hooksPath .githooks` (ya activado en este equipo; repetir si se clona el proyecto en otro).

**Copias de respaldo:** guarda una copia de `data/restricted/` solo en un disco externo o en una carpeta personal privada. Nunca en carpetas compartidas, repositorios, servicios de conversión en línea ni herramientas de IA en la nube.

**Verificar cuentas:** `python scripts/verificar_cuentas.py` prueba cada clave sin mostrarla.

## Estado por fuente / Status by source

| Fuente | Estado | Licencia | Qué se puede publicar | Obligaciones |
|---|---|---|---|---|
| **BirdLife DataZone** (distribución de aves) | ✅ Términos aceptados 18 nov 2026 · ⏳ solicitud en curso (falta confirmar el envío por correo) | Términos propios, solo no comercial | Solo productos derivados transformadores: % de distribución quemada, rankings, top 5. **No** polígonos ni mapas de distribución, ni siquiera simplificados, salvo permiso escrito | Citar fuente y versión · enviar la URL publicada a science@birdlife.org · usar la última versión · usar solo para el fin declarado · no usar el logo · no pasar los datos a terceros · no usarlos para entrenar o validar IA |
| **IUCN Red List** (API y polígonos) | ✅ Cuenta de API activa (18 nov 2026), declarada no comercial · ✅ términos v3.1 (jun 2024) revisados · ⏳ **waiver no solicitado** · polígonos aún no solicitados | Términos propios v3.1: uso libre solo para conservación, educación e investigación; nada comercial | **Sin waiver:** solo el nombre de la especie y su categoría (CR, EN, VU…), que IUCN declara de uso libre (§3). **Con waiver escrito:** cualquier producto derivado, incluso % de distribución quemada y rankings (§4; desde la v3 todo derivado necesita waiver). **Nunca:** polígonos, textos de amenazas o hábitats copiados tal cual, ni descarga de datos | Citar la versión de la Red List (§6) · enviar copia electrónica de lo publicado a redlist@iucn.org (§5) · usar la versión vigente (§7) · el token y la licencia son personales (§1, §11) · no redistribuir respuestas de la API (§4) |
| Copernicus (ERA5, CMIP6, CAMS, FWI) | ✅ Cuentas CDS, ADS y EWDS activas, con los términos de cada sitio aceptados (18 nov 2026) · ✅ licencias de datasets aceptadas: CC-BY (ERA5, GFAS, FWI) y CMIP6 | ERA5, GFAS y FWI: CC BY 4.0 · CMIP6: licencia propia por modelo | Todo, incluidos mapas y grillas derivadas | "Contains modified Copernicus Climate Change Service information [año]" |
| NASA (FIRMS, MODIS, GPM) | Libre | Datos abiertos NASA | Todo | Citar el producto y el DOI |
| NOAA (OISST, ERSST, ONI) | Libre | Dominio público (EE. UU.) | Todo | Citar el producto |
| GFED5 | Libre | CC BY 4.0 | Todo | Citar van der Werf et al. 2025 |
| MapBiomas (Fogo, Amazonía) | Libre | CC BY 4.0 | Todo | Citar la colección y su versión |
| GBIF | Libre (requiere cuenta) | Por dataset: CC0, CC BY o CC BY-NC | Puntos de ocurrencia, respetando la licencia de cada registro | Citar el DOI de cada descarga; excluir CC BY-NC si algún día hubiera uso comercial |
| WorldPop / GHSL | Libre | CC BY 4.0 | Todo | Citar |
| OpenStreetMap | Libre | ODbL | Todo | "© OpenStreetMap contributors" |
| WDPA (Protected Planet) | Libre ⚠️ | No comercial; restringe redistribuir los datos originales | Mapas como imagen y estadísticas; no los polígonos descargables | Citar UNEP-WCMC e IUCN |
| RAISG | Libre ⚠️ | Propiedad de las fuentes de cada país | Según los metadatos de cada capa | Citar según los metadatos |
| SENAMHI / ENFEN / IGP | Libre | Datos públicos del Perú | Todo | Citar la institución |

⚠️ = revisar la licencia exacta al descargar.

## Pendientes / Open items

- [ ] BirdLife: confirmar por correo (science@birdlife.org) que el cruce de capas con scripts SIG es aceptable frente a la cláusula 11 de los términos del sitio web (minería de datos), y si se permiten mapas generalizados.
- [ ] BirdLife: cuando lleguen los datos, anotar la versión y la cita exacta aquí.
- [ ] BirdLife: firmar el *waiver* de republicación si lo envían; revisarlo antes.
- [x] IUCN: leer y anotar los términos (v3.1, revisados el 18 nov 2026).
- [ ] IUCN: pedir un *waiver* a redlist@iucn.org para publicar resultados derivados (% de distribución quemada, top 5). Mientras no llegue, la web solo muestra nombre y categoría de las especies de IUCN; los cálculos con polígonos IUCN se hacen en local y no se publican.
- [ ] IUCN: pedir los polígonos y anotar aquí la versión y la cita. Mamíferos solicitados el 18 nov 2026 (Sudamérica + Brunéi, Indonesia y Malasia; terrestres y de agua dulce; GeoPackage + resumen CSV). **Decisión del 18 nov 2026:** la primera versión usa solo aves (BirdLife); anfibios y reptiles no se piden. Los mamíferos quedan en reserva para una versión futura.
- [ ] Al publicar: enviar copia electrónica (URL) a redlist@iucn.org (§5).
- [ ] Al publicar: enviar la URL a BirdLife (cláusula 7 de los términos de datos).

## Revisión antes de commit o publicación / Pre-commit and pre-publish check

- [ ] `git status` no muestra nada dentro de `data/restricted/` ni claves de API.
- [ ] Ningún archivo publicado (JSON, GeoJSON, imágenes) contiene polígonos o geometrías de BirdLife o IUCN.
- [ ] Los créditos de la página citan cada fuente usada, con su versión.
- [ ] La página no tiene anuncios ni monetización.
