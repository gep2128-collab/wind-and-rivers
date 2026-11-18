# Wind and rivers — Amazon and Borneo

An interactive map of wind, rivers, solar radiation and clouds over the Amazon and Borneo, month by month from 2005 to 2024.

## Open the page

**Online:** https://gep2128-collab.github.io/wind-and-rivers/

The site is served by GitHub Pages from the `main` branch. Every push to `main` updates it within a minute or two.

**On your computer:**

1. Download or clone this repo:
   ```bash
   git clone https://github.com/gep2128-collab/wind-and-rivers.git
   ```
2. Double-click `index.html` to open it in your browser. It works straight from the folder, with no local server.

You need an internet connection either way, because the page loads the D3 and TopoJSON libraries from cdnjs.

## Use the page

- **Region:** World, Amazon or Borneo (top right).
- **Layers:** turn Wind, Rivers, Radiation and Clouds on or off (bottom left).
- **Time:** move the Year and Month sliders, or press **▶ Play** to animate through the months.
- **Map:** drag to pan, scroll to zoom.

## Demo mode vs. real data

When the page first opens it runs in **demo mode**: the wind is a synthetic field (trade winds, a seasonal ITCZ, the Asian monsoon and the South American low-level jet), not measurements. Radiation is the top-of-atmosphere value calculated from the Sun's position, and the Clouds layer stays empty.

To show real data, click **Load ERA5 (.json)** and pick one or more JSON files converted from [ERA5](https://cds.climate.copernicus.eu/) monthly data. Each file needs:

| Field | Meaning |
|---|---|
| `times` | List of month dates, e.g. `"2024-01"` or `"2024-01-01"` |
| `nx`, `ny` | Grid width and height |
| `lon0`, `lat0` | Longitude and latitude of the first grid point |
| `dlon`, `dlat` | Grid spacing in degrees (`dlat` is negative if rows go north to south) |
| `u`, `v` | Wind components in m/s: one flat array of `nx × ny` values per month, row by row |
| `ssrd` *(optional)* | Surface solar radiation in W/m², same layout; enables real radiation |
| `tcc` *(optional)* | Total cloud cover, same layout; enables the Clouds layer |

The page's error message mentions an `era5_to_json.py` converter. That script isn't in this repo yet.

Loaded files stay in your browser only. They are not uploaded anywhere, and reloading the page goes back to demo mode.

## Files

- `index.html`: the visualization page (layout and controls).
- `css/style.css`: the page's styles.
- `js/app.js`: the map, animation and controls.
- `data/land.js`: world land outline (TopoJSON).
- `data/rivers.js`: main rivers of the Amazon and Borneo.
- `Wind and rivers — Amazon and Borneo.html`: old address of the page; it now redirects to `index.html` so existing links keep working.

The map data is in `.js` files instead of `.json` so the page also opens by double-click: browsers block `fetch()` of local files, but they allow `<script src>`.

## Project: El Niño, Lima and fire (in progress)

- [docs/01-introduccion.md](docs/01-introduccion.md): project introduction (Spanish and English).
- [docs/02-fuentes-de-datos.md](docs/02-fuentes-de-datos.md): first data-availability report with download links and the fire-spread formulas.
- [data/catalogo-de-fuentes.csv](data/catalogo-de-fuentes.csv): catalogue of data sources.
- [data/esquema-base-de-datos.sql](data/esquema-base-de-datos.sql): PostgreSQL/PostGIS database schema.
- [docs/03-licencias-y-cumplimiento.md](docs/03-licencias-y-cumplimiento.md): data licences and the compliance checklist. Restricted data goes in `data/restricted/`, which git ignores.
- [docs/04-plan-de-construccion.md](docs/04-plan-de-construccion.md): website build plan based on the data verified so far.
- [docs/05-datos-en-uso.md](docs/05-datos-en-uso.md): data used in version 1, with extraction links, and data left out for now.

### Python scripts

Scripts run in an isolated environment so they don't change your main Python install:

```powershell
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python scripts/verificar_cuentas.py
.venv/Scripts/python scripts/probar_acceso_datos.py
```

Keys go in `.env` (copy `.env.example`). After cloning, turn on the git safety check with `git config core.hooksPath .githooks`.
