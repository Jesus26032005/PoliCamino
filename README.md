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

Estado: Fase 3 (accesos, transporte cercano y ruta a pie).

## Datos

`npm run importar:osm` consulta Overpass y regenera `src/data/zacatenco.lugares.json`.
Todo lo importado entra con `verificado: false`. Datos © colaboradores de OpenStreetMap (ODbL). Teselas de OpenFreeMap.

## Cómo llegar (Fase 3)

- Accesos, Metro y paradas salen de OpenStreetMap con `npm run importar:osm` (todo `verificado: false`).
  Ojo: reimportar sobrescribe `src/data/zacatenco.lugares.json`; si ya corregiste datos a mano, haz un respaldo.
- Rutas a pie: OSRM de FOSSGIS (`https://routing.openstreetmap.de/routed-foot`). Política: máx. 1 petición/s,
  sin uso masivo, atribución y enlace "Corregir el mapa". Las coordenadas de origen y destino se envían a ese servidor.
