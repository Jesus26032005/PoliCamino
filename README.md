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

Estado: Fase 6 (multicampus) + rediseño de la interfaz para PC y móvil.

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

## Multicampus (Fase 6)

Campus disponibles: **Zacatenco** y **Santo Tomás**. El selector de campus cambia centro, polígono, lugares,
filtros y clima sin recargar. Cada campus es su propio conjunto de archivos (`src/data/<id>.*.json`) y se
descarga solo cuando se elige (carga perezosa: cada uno es un chunk aparte en el build). Los enlaces compartidos
llevan el campus (`/?campus=santo-tomas&lugar=id`); si un enlace trae solo `lugar`, la app busca el lugar en los campus.

> Santo Tomás es un multipolígono de 4 parcelas del Casco (OSM `relation/12512609`). Quedan fuera sitios del IPN
> que están separados del Casco, como el CECyT 9. No hay paradas de camión mapeadas cerca en OSM (hoy hay 0);
> los accesos son puertas de OSM sin nombre. Todo está sin verificar.

### Cómo agregar un campus (ej. «Zacatenco II»)

1. **Id.** Elige un id en minúsculas con guiones (`mi-campus`) y agrégalo al tipo `CampusId` en `src/lib/tipos.ts`.
2. **Polígono en OSM.** En openstreetmap.org busca el campus (la vía `way` o relación `relation` que lo delimita) y
   anota su tipo e id. Agrégalo en `scripts/campus-osm.ts`:
   `'mi-campus': { tipo: 'relation', id: 123456 }`. Si no existe en OSM, edítalo en OSM primero (así lo aprovecha todo el mundo).
3. **Importa los datos:** `npm run importar:osm -- mi-campus`. Genera `src/data/mi-campus.lugares.json`,
   `.limite.json` y `.servicios.json` (vacío). Overpass a veces responde 502; el script reintenta solo. Al final imprime la
   caja del polígono. Revisa los lugares importados: todo entra `verificado: false`.
4. **Metadatos.** En `src/data/campus.ts` agrega el campus a `CAMPUS` (nombre, `centro`, `zoom`, y `limites` = caja
   del polígono + ~0.004° de margen, `[[sur, oeste], [norte, este]]`) y a `CAMPUS_LISTA`.
5. **Carga perezosa.** En `src/lib/lugares.ts` agrega el campus a los tres mapas `CARGADORES`, `CARGADORES_SERVICIOS`
   y `CARGADORES_LIMITE` (un `import()` por archivo).
6. **Siglas.** Si el campus tiene escuelas con siglas de uso común, agrégalas en `scripts/clasificar.ts` (`ALIAS`) y
   reimporta. Solo siglas que estés seguro de que son oficiales.
7. **Ocupación (opcional).** `npm run generar:ocupacion` actualiza la lista de ids del Worker y vuelve a desplegarlo
   (`wrangler deploy`); una prueba avisa si quedan desincronizados.
8. **Comprueba:** `npm test` valida los datos de **todos** los campus de `CAMPUS_LISTA` (límites, fuentes, sin
   verificados) y `npm run dev` te deja verlo en el selector. Haz commit de los JSON generados.

Reimportar un campus sobrescribe `lugares.json` y `limite.json`, **nunca** `servicios.json`.

## Diseño de la interfaz

El mapa ocupa toda la pantalla y el resto flota encima:

- **Barra superior** (`App.tsx`): marca, selector de campus, accesos rápidos (escritorio) o buscador (móvil),
  aviso de proyecto no oficial, clima y «¿Dónde estoy?».
- **Panel** (`components/Panel.tsx`): pestañas Lugares · Cómo llegar · Hoy. En escritorio (≥ 56rem) es un panel
  lateral; en móvil es una hoja inferior con tres alturas (mínima, media, expandida). Los tamaños viven en `.panel`
  (`styles/index.css`) y deben coincidir con `rellenoDelMapa()` en `App.tsx`, que le dice al mapa qué zona queda libre.
- **Tokens** (`styles/tokens.css`): colores claro/oscuro, radios, tipografías (Inter para texto, Space Grotesk
  para títulos y cifras) y el punto de corte `desk`. Los componentes solo usan esas clases.
- Los controles de MapLibre (zoom y atribución de OSM) suben con la hoja inferior para no quedar tapados.
