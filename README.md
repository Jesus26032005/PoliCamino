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

Estado: Fase 5 (enchufes/silencio y ocupación reportada).

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

## Ocupación reportada por estudiantes (Fase 5-A)

Piloto en **cafeterías y bibliotecas** (`CATEGORIAS_CON_OCUPACION`). Cada persona reporta en un toque
(Vacío / Poca gente / Concurrido / Lleno) y el detalle del lugar muestra la **mediana** de los últimos 45 min.

**Reglas anti-abuso** (en `src/lib/ocupacion.ts`, compartidas por la app y el Worker):
mínimo 3 reportes de al menos 2 dispositivos distintos; 1 reporte por dispositivo y lugar cada 10 min;
máx. 10 reportes/hora por dispositivo y 20/hora por red; los reportes caducan a los 45 min y se borran a las 24 h.
Si no hay suficientes reportes, se dice «sin datos recientes»: no se inventa nada.

**Privacidad:** sin cuentas ni ubicación. El servidor solo guarda un hash del identificador aleatorio del
dispositivo y un hash de la IP con sal diaria (nunca la IP), por 24 h, para frenar abusos.
Conviene publicar un aviso de privacidad propio antes de abrir la función al público.

### Probar en local

```bash
echo "SAL_SECRETA=cualquier-texto-local" > worker/.dev.vars   # no se sube a git
npm run worker:esquema-local     # crea las tablas en la D1 local
npm run worker:dev               # Worker en http://localhost:8787
echo "VITE_API_OCUPACION=http://localhost:8787" > .env.local
npm run dev                      # reinicia Vite para que lea .env.local
```

### Publicar el Worker (necesita una cuenta de Cloudflare; lo haces tú)

1. `npx wrangler d1 create rutapoli-ocupacion` y copia el `database_id` a `worker/wrangler.jsonc`.
2. `npx wrangler d1 execute rutapoli-ocupacion --remote --file=worker/schema.sql`
3. `npx wrangler secret put SAL_SECRETA --config worker/wrangler.jsonc` (un texto largo y aleatorio).
4. En `worker/wrangler.jsonc`, pon el dominio real en `ORIGENES_PERMITIDOS` y ejecuta
   `npx wrangler deploy --config worker/wrangler.jsonc`.
5. Al construir el sitio define `VITE_API_OCUPACION=https://<tu-worker>.workers.dev`. Sin esa variable, la función queda oculta.

Si cambian los lugares: `npm run importar:osm` y luego `npm run generar:ocupacion` (la prueba avisa si se desincronizan).

**Moderar:** para bloquear un dispositivo o red abusivos, inserta su hash en la tabla `bloqueados`
(`wrangler d1 execute ... --command "INSERT INTO bloqueados VALUES ('<hash>','motivo',<ms>)"`). Los hashes se ven en la tabla `reportes`.

**Costos** (planes gratuitos de Cloudflare, verificados el 13-nov-2026): Workers 100,000 peticiones/día;
D1 5 millones de filas leídas y 100,000 escritas por día, 5 GB. La lectura se cachea 20 s en memoria y 30 s en el navegador.
