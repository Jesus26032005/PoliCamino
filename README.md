# RutaPoli

Mapa interactivo **no oficial** del Instituto Politécnico Nacional (IPN). Proyecto
independiente hecho por estudiantes; no pertenece ni está avalado por el IPN.

## Desarrollo

```bash
npm install
npm run dev        # servidor de desarrollo
npm test           # pruebas (Vitest)
npm run lint       # ESLint
npm run format     # Prettier
npm run build      # build de producción
```

## Estructura

- `src/lib/config.ts`: nombre de la app (una sola constante).
- `src/styles/tokens.css`: tokens de diseño (colores claro/oscuro, radios, tipografía).
- `src/components/`: componentes reutilizables.
- `src/features/`: funciones por dominio (mapa, búsqueda...).
- `src/data/`: datos en JSON (lugares por campus).

Estado: Fase 4 (tarjeta «Hoy en el campus»: clima, aire y sismos).

## Datos

`npm run importar:osm` consulta Overpass y regenera `src/data/zacatenco.lugares.json`.
Todo lo importado entra con `verificado: false`. Datos © colaboradores de OpenStreetMap (ODbL). Teselas de OpenFreeMap.

## Cómo llegar (Fase 3)

- Accesos, Metro y paradas salen de OpenStreetMap con `npm run importar:osm` (todo `verificado: false`).
  Ojo: reimportar sobrescribe `src/data/zacatenco.lugares.json`; si ya corregiste datos a mano, haz un respaldo.
- Rutas a pie: OSRM de FOSSGIS (`https://routing.openstreetmap.de/routed-foot`). Política: máx. 1 petición/s,
  sin uso masivo, atribución y enlace "Corregir el mapa". Las coordenadas de origen y destino se envían a ese servidor.

## Datos en vivo (Fase 4)

| Dato             | Fuente                                | Notas                                                                                          |
| ---------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Clima            | [Open-Meteo](https://open-meteo.com/) | Gratis para uso no comercial (CC BY 4.0, atribución obligatoria). Caché 10 min.                |
| Calidad del aire | Open-Meteo, modelo CAMS (Copernicus)  | Estimación de modelo global (~45 km), no una estación. AQI de EE. UU., no IMECA. Caché 30 min. |
| Sismos           | Servicio Sismológico Nacional (RSS)   | El SSN solo ofrece HTTP y sin CORS: se lee a través de `/api/sismos`. Caché 5 min.             |

`/api/sismos` es un proxy mínimo: en desarrollo lo hace Vite (`vite.config.ts`); en producción,
la función `api/sismos.ts` (formato Vercel Functions, **aún no probada desplegada**). Sin ella, la tarjeta
muestra el error de sismos y el resto sigue funcionando.

## Enchufes y zonas silenciosas (Fase 5-C)

Los datos viven en `src/data/zacatenco.servicios.json` (separado de `zacatenco.lugares.json`, que se
regenera desde OSM). Está vacío hasta que alguien aporte datos reales: **no se inventan**.

```json
{
  "osm-w293805766": {
    "enchufes": {
      "valor": "pocos",
      "fuente": "Visita de Ana, biblioteca ESFM",
      "fecha": "2026-11-13",
      "verificado": false
    },
    "silencio": {
      "valor": "silencioso",
      "fuente": "Visita de Ana, biblioteca ESFM",
      "fecha": "2026-11-13",
      "verificado": false
    }
  }
}
```

- `enchufes`: `muchos` | `pocos` | `no`. `silencio`: `silencioso` | `moderado` | `ruidoso`.
- Cada dato lleva `fuente` (cómo lo comprobaste), `fecha` (AAAA-MM-DD) y `verificado`.
- El id del lugar sale de `zacatenco.lugares.json` (o de la URL `/?lugar=id`). La app valida el archivo al cargar y
  rechaza ids inexistentes, valores raros o aportes sin fuente.
- Los chips «Con enchufes» y «Silencioso» aparecen solos cuando hay al menos un lugar con ese dato.
- El botón «Sugerir datos» abre un issue prellenado; se activa al poner la dirección del repositorio en
  `URL_REPOSITORIO` (`src/lib/config.ts`).
