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

Estado: Fase 2 (búsqueda, filtros por categoría, ubicación y enlaces compartibles).

## Datos

`npm run importar:osm` consulta Overpass y regenera `src/data/zacatenco.lugares.json`.
Todo lo importado entra con `verificado: false`. Datos © colaboradores de OpenStreetMap (ODbL). Teselas de OpenFreeMap.
