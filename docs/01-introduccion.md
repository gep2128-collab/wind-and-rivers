# El Niño y el fuego en la Amazonía y Borneo
# El Niño and fire in the Amazon and Borneo

*Borrador v0.3 — 18 nov 2026 · Draft v0.3 — 18 Nov 2026*

---

## Español

### Introducción

El Fenómeno El Niño–Oscilación del Sur (ENOS) es la mayor fuente de variabilidad climática del planeta de un año a otro. Cuando el Pacífico ecuatorial se calienta, cambian los vientos alisios, se desplazan las zonas de lluvia y se alteran la nubosidad y la temperatura del aire a miles de kilómetros de distancia.

La primera señal aparece en el mar: frente a la costa del Perú y de Sudamérica (región **Niño 1+2**) el agua se calienta varios grados, con lluvias e inundaciones en toda esa costa. Pero este proyecto no se centra en la costa, sino en los efectos a distancia que El Niño produce en dos de los bosques tropicales más grandes del planeta.

Ese calentamiento del Pacífico trae **sequía a la Amazonía y a Borneo**. Bosques húmedos que normalmente no arden se secan y el fuego, casi siempre iniciado por personas para limpiar terreno, se escapa y se propaga. Los incendios de Borneo en 2015 y los de la Amazonía en 2015–16 y 2023–24 coinciden con eventos El Niño fuertes. Y en 2026 hay otro en curso: en octubre de 2026 el mar frente a Perú (región Niño 1+2) estuvo 5.25 °C por encima de lo normal (NOAA).

Este proyecto es una **página web interactiva** que conecta esas piezas:

1. **El océano:** la temperatura superficial del mar (y su anomalía) con una escala de color, mes a mes, de 2005 a 2026.
2. **La atmósfera:** el movimiento del aire (viento), su temperatura, la nubosidad y la precipitación.
3. **El fuego:** focos de calor y área quemada en la Amazonía y Borneo, y su relación con los años El Niño.
4. **Una simulación de incendio:** el usuario coloca un punto en el mapa y ve cómo se expande el fuego según la temporada, el viento, la humedad, la pendiente y el tipo de vegetación.
5. **Los impactos:** porcentaje de flora y fauna afectada, un **top 5 de especies** y de **comunidades humanas** afectadas, el **CO₂ emitido** por el fuego frente al **oxígeno** que el bosque produce normalmente.
6. **Lo que viene después del fuego:** negocios, empresas, plantaciones e industrias que se instalaron sobre zonas que antes se quemaron.
7. **Los próximos 20 años:** escenarios 2026–2045 basados en proyecciones climáticas (CMIP6), presentados como rangos posibles, no como predicciones exactas.

### ¿Por qué la Amazonía y Borneo?

Las dos regiones **comparten la misma franja de latitud**: el ecuador las cruza a ambas. Por eso tienen un clima parecido (calor todo el año y lluvias abundantes) y bosques tropicales húmedos muy similares. Y están **a los dos lados del océano Pacífico**: la Amazonía al este y Borneo al oeste.

| | Amazonía | Borneo |
|---|---|---|
| Posición aproximada | Entre unos 10° N y 20° S, y entre 44° O y 80° O; el ecuador cruza su parte norte | Entre unos 4° S y 7° N, y entre 109° E y 119° E; el ecuador la cruza por el centro (≈ 0°, 114° E) |
| Tamaño | Región amazónica: unos **8.47 millones de km²** repartidos entre 9 países | Isla de unos **743 000–751 000 km²**, la tercera más grande del mundo, repartida entre Indonesia, Malasia y Brunéi |
| Lugar entre los bosques tropicales | **El más grande del mundo**, más de tres veces el segundo (Congo) | Entre los mayores del mundo (suele situarse cuarto, después de la Amazonía, el Congo y Nueva Guinea) y uno de los más antiguos |

**La conexión con El Niño:** en un año normal, el aire caliente y húmedo sube sobre Indonesia y Borneo y sobre la Amazonía, y forma las nubes y lluvias de los dos bosques. Cuando llega El Niño, esa zona de aire ascendente se desplaza hacia el centro del Pacífico. Sobre los dos bosques el aire baja, hay menos nubes y menos lluvia: llega la sequía, y con ella el fuego. Por eso dos bosques separados por unos 19 500 km, casi en lados opuestos del planeta, sufren al mismo tiempo.

La cuenca del Congo también está en el ecuador, pero el proyecto se centra en los dos bosques donde la relación entre El Niño, la sequía y los grandes incendios está mejor documentada (Borneo 2015; Amazonía 2015–16 y 2023–24).

**Fuentes:** [Mongabay, *The world's great rainforests* (2020)](https://news.mongabay.com/2020/06/the-worlds-great-rainforests/) · [RAISG, *Amazon in numbers*](https://www.raisg.org/en/?p=31738) · [MapBiomas Amazonía, ficha 2024](https://amazonia.mapbiomas.org/wp-content/uploads/sites/10/2024/09/Factsheet_Amazonia_6.0_final.pdf) · [Encyclopaedia Britannica, *Borneo*](https://www.britannica.com/place/Borneo-island-Pacific-Ocean) · [Wikipedia, *Borneo*](https://en.wikipedia.org/wiki/Borneo)

### Preguntas que guían el proyecto

1. ¿Cuánto CO₂ libera un incendio comparado con lo que ese bosque captura en un año?
2. ¿Qué uso económico tiene hoy la tierra que se quemó?
3. ¿Cuánto cambia el clima de la Amazonía y de Borneo (temperatura del aire, lluvia, nubosidad y humedad) durante un evento El Niño frente a un año normal?
4. ¿Cuál es el impacto de El Niño en la expansión del fuego, comparado con una época sin El Niño, y cuáles podrían ser sus causas climáticas?

### Alcance

- **Periodo histórico:** 2005–2026 (amplía la visualización actual *Wind and rivers*, que cubre 2005–2024, e incluye el El Niño de 2026).
- **Zonas piloto del simulador:** Madre de Dios (Amazonía peruana) y Kalimantan Central (Borneo).
- **Idioma:** la web tendrá un botón ES/EN.
- **Escenarios:** 2026–2045.
- **Regiones de estudio:** cuenca amazónica e isla de Borneo. El Pacífico ecuatorial (Niño 1+2 y Niño 3.4) aparece solo como origen de la señal de El Niño.

### Lo que este proyecto no es

No es un sistema de alerta ni un modelo operativo de incendios. La simulación de propagación es educativa: usa fórmulas publicadas y datos reales, pero simplificados para correr en un navegador. Las cifras de especies y de oxígeno son estimaciones derivadas, y la página lo dirá de forma explícita.

---

## English

### Introduction

The El Niño–Southern Oscillation (ENSO) is the planet's largest source of year-to-year climate variability. When the equatorial Pacific warms, the trade winds change, rain belts shift, and cloud cover and air temperature change thousands of kilometres away.

The first sign appears at sea: off the coast of Peru and South America (the **Niño 1+2** region) the water warms by several degrees, bringing rain and floods along that whole coast. This project does not focus on the coast, though, but on the remote effects El Niño has on two of the largest tropical forests on Earth.

That Pacific warming brings **drought to the Amazon and Borneo**. Humid forests that normally do not burn dry out, and fire, almost always lit by people to clear land, escapes and spreads. The 2015 Borneo fires and the 2015–16 and 2023–24 Amazon fires coincide with strong El Niño events. Another one is under way in 2026: in October 2026 the sea off Peru (Niño 1+2 region) was 5.25 °C above normal (NOAA).

This project is an **interactive web page** that connects those pieces:

1. **The ocean:** sea surface temperature (and its anomaly) on a colour scale, month by month, 2005 to 2026.
2. **The atmosphere:** air movement (wind), air temperature, cloud cover and precipitation.
3. **Fire:** hotspots and burned area in the Amazon and Borneo, and how they relate to El Niño years.
4. **A fire simulation:** the user drops a point on the map and watches the fire spread depending on the season, wind, moisture, slope and vegetation type.
5. **Impacts:** percentage of flora and fauna affected, a **top 5 of species** and of **human communities** affected, **CO₂ emitted** by the fire versus the **oxygen** the forest normally produces.
6. **What comes after the fire:** businesses, companies, plantations and industries set up on land that previously burned.
7. **The next 20 years:** 2026–2045 scenarios based on climate projections (CMIP6), shown as ranges of possible outcomes, not exact predictions.

### Why the Amazon and Borneo?

The two regions **share the same latitude band**: the equator crosses both. That gives them a similar climate (hot all year, with abundant rain) and very similar humid tropical forests. And they sit **on opposite sides of the Pacific Ocean**: the Amazon to the east, Borneo to the west.

| | Amazon | Borneo |
|---|---|---|
| Approximate position | About 10° N to 20° S and 44° W to 80° W; the equator crosses its northern part | About 4° S to 7° N and 109° E to 119° E; the equator crosses its middle (≈ 0°, 114° E) |
| Size | Amazon region: about **8.47 million km²** across 9 countries | Island of about **743,000–751,000 km²**, the world's third largest, shared by Indonesia, Malaysia and Brunei |
| Rank among tropical forests | **The world's largest**, more than three times the second (Congo) | Among the world's largest (usually ranked fourth, after the Amazon, Congo and New Guinea) and one of the oldest |

**The El Niño link:** in a normal year, warm, moist air rises over Indonesia and Borneo and over the Amazon, forming the clouds and rain of both forests. During El Niño that zone of rising air shifts to the central Pacific. Over both forests the air sinks instead, with fewer clouds and less rain: drought arrives, and fire with it. That is why two forests about 19,500 km apart, almost on opposite sides of the planet, suffer at the same time.

The Congo basin also lies on the equator, but the project focuses on the two forests where the link between El Niño, drought and major fires is best documented (Borneo 2015; Amazon 2015–16 and 2023–24).

**Sources:** the same links as in the Spanish section above.

### Guiding questions

1. How much CO₂ does a fire release compared with what that forest absorbs in a year?
2. What is the land that burned used for today?
3. How much does the climate of the Amazon and Borneo (air temperature, rain, cloud cover and humidity) change during an El Niño event compared with a normal year?
4. What is El Niño's impact on how fire spreads, compared with a period without El Niño, and what could its climate causes be?

### Scope

- **Historical period:** 2005–2026 (extends the current *Wind and rivers* visualization, which covers 2005–2024, and includes the 2026 El Niño).
- **Fire simulator pilot areas:** Madre de Dios (Peruvian Amazon) and Central Kalimantan (Borneo).
- **Language:** the site will have an ES/EN button.
- **Scenarios:** 2026–2045.
- **Study regions:** the Amazon basin and Borneo. The equatorial Pacific (Niño 1+2 and Niño 3.4) appears only as the source of the El Niño signal.

### What this project is not

It is not a warning system or an operational fire model. The spread simulation is educational: it uses published formulas and real data, simplified to run in a browser. Species and oxygen figures are derived estimates, and the page will say so explicitly.
