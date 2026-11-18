-- Base de datos del proyecto El Niño · Lima · Fuego
-- Project database: El Niño · Lima · Fire
--
-- Motor / engine: PostgreSQL 15+ con / with PostGIS 3+
--
-- Regla / rule:
--   Las grillas grandes (TSM, ERA5, CMIP6, área quemada raster) se guardan como archivos
--   (NetCDF, Cloud-Optimized GeoTIFF o JSON para la web) y aquí solo se registran.
--   Large grids are stored as files and only indexed here (table raster_layer).
--   Puntos, polígonos y series de tiempo van en tablas.
--   Points, polygons and time series live in tables.

CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Catálogo de fuentes / source catalogue -------------------------------------------
CREATE TABLE data_source (
    source_id      TEXT PRIMARY KEY,            -- ej. 'oisst_v21', 'era5_monthly'
    name           TEXT NOT NULL,
    provider       TEXT NOT NULL,
    topic          TEXT NOT NULL,               -- ocean, atmosphere, fire, biodiversity, people, economy, projection
    url            TEXT NOT NULL,
    license        TEXT,
    spatial_res    TEXT,                        -- '0.25°', '500 m', 'point'
    temporal_res   TEXT,                        -- 'daily', 'monthly', 'annual'
    period_start   DATE,
    period_end     DATE,
    accessed_on    DATE,
    notes          TEXT
);

-- 2. Regiones de estudio / study regions ------------------------------------------------
CREATE TABLE region (
    region_id  TEXT PRIMARY KEY,                -- 'lima', 'nino12', 'nino34', 'amazon', 'borneo'
    name_es    TEXT NOT NULL,
    name_en    TEXT NOT NULL,
    geom       geometry(MultiPolygon, 4326) NOT NULL
);

-- 3. Capas raster registradas / indexed raster layers -----------------------------------
CREATE TABLE raster_layer (
    layer_id    BIGSERIAL PRIMARY KEY,
    source_id   TEXT NOT NULL REFERENCES data_source,
    variable    TEXT NOT NULL,                  -- 'sst', 'sst_anom', 'u10', 'v10', 't2m', 'tcc', 'tp', 'fwi', 'burned_area', 'npp'
    unit        TEXT NOT NULL,
    period      DATE NOT NULL,                  -- primer día del mes / first day of month
    scenario    TEXT NOT NULL DEFAULT 'historical', -- 'historical', 'ssp245', 'ssp585'
    region_id   TEXT REFERENCES region,
    file_path   TEXT NOT NULL,                  -- ruta al archivo / path to file
    UNIQUE (source_id, variable, period, scenario, region_id)
);

-- 4. Índices ENOS / ENSO indices --------------------------------------------------------
CREATE TABLE enso_index (
    index_name  TEXT NOT NULL,                  -- 'ONI', 'ICEN', 'NINO12', 'NINO34'
    period      DATE NOT NULL,
    value       REAL NOT NULL,
    phase       TEXT,                           -- 'nino', 'nina', 'neutral'
    magnitude   TEXT,                           -- 'debil', 'moderado', 'fuerte', 'extraordinario'
    source_id   TEXT NOT NULL REFERENCES data_source,
    PRIMARY KEY (index_name, period)
);

-- 5. Estaciones y observaciones (SENAMHI) / weather stations ---------------------------
CREATE TABLE station (
    station_id  TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    type        TEXT,                           -- 'meteorologica', 'hidrologica'
    altitude_m  REAL,
    geom        geometry(Point, 4326) NOT NULL,
    source_id   TEXT REFERENCES data_source
);

CREATE TABLE station_obs_daily (
    station_id  TEXT NOT NULL REFERENCES station,
    obs_date    DATE NOT NULL,
    tmax_c      REAL,
    tmin_c      REAL,
    precip_mm   REAL,
    rh_pct      REAL,
    flow_m3s    REAL,                           -- caudal / river flow
    PRIMARY KEY (station_id, obs_date)
);

-- 6. Eventos de impacto en Lima / impact events ----------------------------------------
CREATE TABLE impact_event (
    event_id     BIGSERIAL PRIMARY KEY,
    event_date   DATE NOT NULL,
    event_type   TEXT NOT NULL,                 -- 'lluvia', 'huaico', 'inundacion', 'oleaje'
    district     TEXT,
    affected_people INTEGER,
    damaged_homes   INTEGER,
    geom         geometry(Point, 4326),
    source_id    TEXT REFERENCES data_source
);

-- 7. Incendios / fires -----------------------------------------------------------------
CREATE TABLE fire_hotspot (                    -- NASA FIRMS
    hotspot_id  BIGSERIAL PRIMARY KEY,
    acq_time    TIMESTAMPTZ NOT NULL,
    sensor      TEXT NOT NULL,                  -- 'MODIS', 'VIIRS_SNPP', 'VIIRS_NOAA20'
    frp_mw      REAL,                           -- potencia radiativa / fire radiative power
    confidence  TEXT,
    region_id   TEXT REFERENCES region,
    geom        geometry(Point, 4326) NOT NULL
);
CREATE INDEX ON fire_hotspot USING GIST (geom);
CREATE INDEX ON fire_hotspot (acq_time);

CREATE TABLE burned_area (                     -- cicatrices / burn scars (MapBiomas, MCD64A1 vectorizado)
    scar_id     BIGSERIAL PRIMARY KEY,
    year        SMALLINT NOT NULL,
    month       SMALLINT,
    area_ha     REAL NOT NULL,
    land_cover_before TEXT,                     -- bosque, sabana, pasto, turba...
    region_id   TEXT REFERENCES region,
    source_id   TEXT NOT NULL REFERENCES data_source,
    geom        geometry(MultiPolygon, 4326) NOT NULL
);
CREATE INDEX ON burned_area USING GIST (geom);

CREATE TABLE fire_emission_monthly (           -- GFED5 / CAMS GFAS agregado por región
    region_id   TEXT NOT NULL REFERENCES region,
    period      DATE NOT NULL,
    burned_ha   REAL,
    co2_tg      REAL,                           -- teragramos / teragrams
    co_tg       REAL,
    ch4_tg      REAL,
    pm25_tg     REAL,
    source_id   TEXT NOT NULL REFERENCES data_source,
    PRIMARY KEY (region_id, period, source_id)
);

CREATE TABLE forest_productivity (             -- MODIS NPP → O2 estimado
    region_id   TEXT NOT NULL REFERENCES region,
    year        SMALLINT NOT NULL,
    npp_tg_c    REAL NOT NULL,                  -- producción primaria neta (Tg C)
    o2_gross_tg REAL GENERATED ALWAYS AS (npp_tg_c * 32.0 / 12.0) STORED,
    source_id   TEXT NOT NULL REFERENCES data_source,
    PRIMARY KEY (region_id, year)
);

-- 8. Vegetación y combustible para el simulador / fuel for the simulator ---------------
CREATE TABLE fuel_class (
    fuel_id        TEXT PRIMARY KEY,            -- 'bosque_denso', 'bosque_degradado', 'pasto', 'turba', 'agricultura', 'urbano', 'agua'
    name_es        TEXT NOT NULL,
    name_en        TEXT NOT NULL,
    p_veg          REAL NOT NULL,               -- Alexandridis
    p_den          REAL NOT NULL,
    fuel_load_kg_m2 REAL,                       -- para CO2 / for CO2
    combustion_completeness REAL,               -- 0–1
    emission_factor_co2_g_kg REAL               -- ~1600 bosque tropical (Andreae 2019)
);

-- 9. Biodiversidad / biodiversity ------------------------------------------------------
CREATE TABLE species (
    species_id     BIGSERIAL PRIMARY KEY,
    scientific_name TEXT NOT NULL UNIQUE,
    common_name_es TEXT,
    common_name_en TEXT,
    kingdom        TEXT NOT NULL,               -- 'Plantae', 'Animalia'
    class          TEXT,
    iucn_category  TEXT,                        -- 'CR', 'EN', 'VU', 'NT', 'LC', 'DD'
    endemic_to     TEXT,                        -- 'amazon', 'borneo', NULL
    gbif_key       BIGINT,
    iucn_id        BIGINT
);

CREATE TABLE species_range (
    species_id  BIGINT NOT NULL REFERENCES species,
    source_id   TEXT NOT NULL REFERENCES data_source,  -- iucn, bien, gbif_hull
    area_km2    REAL,
    geom        geometry(MultiPolygon, 4326) NOT NULL,
    PRIMARY KEY (species_id, source_id)
);
CREATE INDEX ON species_range USING GIST (geom);

-- 10. Comunidades humanas / human communities ------------------------------------------
CREATE TABLE community (
    community_id  BIGSERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    type          TEXT NOT NULL,                -- 'territorio_indigena', 'comunidad_nativa', 'area_protegida', 'centro_poblado'
    people        TEXT,                         -- pueblo / ethnic group
    population    INTEGER,
    country       TEXT,
    source_id     TEXT NOT NULL REFERENCES data_source,
    geom          geometry(Geometry, 4326) NOT NULL
);
CREATE INDEX ON community USING GIST (geom);

-- 11. Uso posterior al fuego / land use after fire -------------------------------------
CREATE TABLE land_use_after_fire (
    scar_id      BIGINT NOT NULL REFERENCES burned_area,
    year_checked SMALLINT NOT NULL,
    land_use     TEXT NOT NULL,                 -- 'pasto', 'soya', 'palma', 'pulpa', 'mineria', 'urbano', 'regeneracion'
    area_ha      REAL NOT NULL,
    source_id    TEXT NOT NULL REFERENCES data_source,
    PRIMARY KEY (scar_id, year_checked, land_use)
);

CREATE TABLE economic_site (
    site_id      BIGSERIAL PRIMARY KEY,
    name         TEXT,
    company      TEXT,
    sector       TEXT NOT NULL,                 -- 'palma', 'pulpa', 'soya', 'ganaderia', 'mineria', 'petroleo', 'industria', 'comercio'
    site_type    TEXT,                          -- 'concesion', 'planta', 'empresa', 'mina', 'bloque'
    start_year   SMALLINT,
    country      TEXT,
    source_id    TEXT NOT NULL REFERENCES data_source,
    geom         geometry(Geometry, 4326) NOT NULL
);
CREATE INDEX ON economic_site USING GIST (geom);

-- 12. Simulaciones del usuario / user simulations --------------------------------------
CREATE TABLE simulation_run (
    run_id        BIGSERIAL PRIMARY KEY,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    ignition      geometry(Point, 4326) NOT NULL,
    sim_month     DATE NOT NULL,                -- mes y año del clima usado
    scenario      TEXT NOT NULL DEFAULT 'historical',
    steps         INTEGER NOT NULL,
    params        JSONB NOT NULL,               -- p_h, a, c1, c2, viento, humedad...
    burned_ha     REAL,
    co2_t         REAL,
    perimeter     geometry(MultiPolygon, 4326)
);

-- Vista: especies más afectadas por una simulación / most affected species for a run
CREATE VIEW simulation_species_impact AS
SELECT r.run_id,
       s.species_id,
       s.scientific_name,
       s.kingdom,
       s.iucn_category,
       ST_Area(ST_Intersection(sr.geom, r.perimeter)::geography) / 1e6 AS burned_range_km2,
       100.0 * ST_Area(ST_Intersection(sr.geom, r.perimeter)::geography)
             / NULLIF(ST_Area(sr.geom::geography), 0)                  AS pct_range_burned
FROM simulation_run r
JOIN species_range sr ON ST_Intersects(sr.geom, r.perimeter)
JOIN species s USING (species_id);
-- Top 5: ORDER BY pct_range_burned * peso_iucn DESC LIMIT 5
