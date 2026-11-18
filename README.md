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
2. Double-click `Wind and rivers — Amazon and Borneo.html` (or `index.html`) to open it in your browser.

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

- `Wind and rivers — Amazon and Borneo.html`: the visualization (single self-contained page).
- `index.html`: redirects to the visualization so the short Pages link works.
