# RutaPoli

**Sitio:** https://rutapoli.pages.dev

Mapa interactivo **no oficial** de los campus del Instituto Politécnico Nacional (IPN): Zacatenco y
Santo Tomás. Proyecto independiente hecho por estudiantes; **no pertenece ni está avalado por el IPN** y
no usa su escudo ni su marca.

- Busca escuelas, bibliotecas, cafeterías y más (entiende siglas como «ESCOM» y nombres sin acentos).
- Cómo llegar: Metro, estaciones, paradas y accesos cercanos, y ruta a pie entre dos puntos.
- Hoy en el campus: clima, calidad del aire y sismos recientes, con su fuente y hora.
- Comparte un lugar con un enlace (`/?campus=…&lugar=…`).
- Se instala como app y funciona sin conexión con lo que ya viste.

Todo lo que viene de OpenStreetMap está marcado **sin verificar** hasta que alguien lo confirme en campo.
¿Quieres ayudar? Lee [CONTRIBUTING.md](CONTRIBUTING.md).

## Desarrollo

Requiere Node 20.19 o superior.

```bash
npm install
npm run dev          # servidor de desarrollo (http://localhost:5173)
npm test             # pruebas (Vitest)
npm run lint         # ESLint
npm run format       # Prettier
npm run build        # build de producción en dist/
npm run pages:dev    # build + emulación local de Cloudflare Pages (http://localhost:8788)
```

`npm run pages:dev` es la forma más fiel de probar producción: sirve `dist/` con la función
`/api/sismos`, los encabezados de `public/_headers` (CSP incluida) y el service worker.

### Estructura

- `src/lib/`: lógica pura y probada (búsqueda, datos, rutas, datos en vivo, ocupación…).
- `src/features/`: funciones por dominio (mapa, lugares, ruta, en vivo, ocupación, PWA).
- `src/components/`: componentes reutilizables (panel, botones, buscador, filtros).
- `src/styles/tokens.css`: tokens de diseño; ningún componente usa colores o tamaños sueltos.
- `src/data/`: datos por campus (`<campus>.lugares.json`, `.limite.json`, `.servicios.json`).
- `src/lib/config.ts`: nombre de la app (una sola constante) y textos del aviso.
- `scripts/`: importador de OpenStreetMap y utilidades de datos.
- `functions/api/sismos.ts`: proxy del SSN (Cloudflare Pages Function).
- `worker/`: Worker de ocupación (Cloudflare Workers + D1), se despliega aparte.
- `pwa.config.ts`: manifest y estrategia de caché offline.
- `public/mapa/` y `public/glifos/`: mapa base (PMTiles) y tipografías de sus etiquetas.
- `scripts/extraer_mapa.py`: recorta el mapa base de Protomaps a la zona de los campus.

## Publicar (Cloudflare Pages)

El sitio es estático más una función (`/api/sismos`). Se eligió Cloudflare Pages porque el Worker de
ocupación ya vive en Cloudflare: todo queda en una plataforma y en su plan gratuito. HTTPS, compresión y
CDN los pone Cloudflare.

1. Necesitas una cuenta de Cloudflare. Inicia sesión desde la terminal: `npx wrangler login`.
2. (Opcional) Si ya publicaste el Worker de ocupación, crea `.env.production.local` con
   `VITE_API_OCUPACION=https://<tu-worker>.workers.dev`.
3. `npm run deploy` construye y publica en el proyecto `rutapoli` (la primera vez lo crea y te da la URL
   `https://rutapoli.pages.dev`).
4. Agrega esa URL a `ORIGENES_PERMITIDOS` en `worker/wrangler.jsonc` y vuelve a desplegar el Worker.

Alternativa: conectar el repositorio de GitHub en el panel de Cloudflare Pages
(comando de build `npm run build`, carpeta `dist`), para publicar en cada push.

## App instalable y sin conexión (PWA)

- **Instalable**: manifest con nombre, íconos propios (incluido uno _maskable_) y service worker.
  Chrome no reporta errores de instalabilidad.
- **Sin conexión** (verificado en Chrome con la red cortada, sobre la emulación de Cloudflare): abre la
  app, el mapa base **completo** de ambos campus (calles, edificios y etiquetas), los lugares, la búsqueda
  y los enlaces compartidos. Aparece un aviso «Sin conexión». Las rutas y los datos en vivo necesitan red y
  lo dicen.
- **Qué se guarda**: la app, los lugares y las tipografías del mapa se precachean (~2.5 MB). El mapa base
  (un PMTiles de 4.6 MB) se guarda aparte la primera vez que se ve el mapa, salvo con ahorro de datos
  activado; el panel lo indica («Mapa guardado para usarlo sin conexión»).
- **Actualizaciones**: cuando hay una versión nueva, la app pregunta antes de recargar.

## Calidad

- 147 pruebas (Vitest): búsqueda con los datos reales, validación y carga de datos de todos los campus,
  importador de OSM, geometría, estilo y fuente del mapa base, rutas, datos en vivo con respuestas reales guardadas, caché, ocupación
  (reglas y Worker) y proxy del SSN.
- Lighthouse 12 sobre el build de producción servido con la emulación local de Cloudflare Pages
  (`npm run pages:dev`; en móvil, mediana de 3 corridas):

| Categoría                | Móvil | PC     |
| ------------------------ | ----- | ------ |
| Rendimiento              | 62    | 94     |
| Accesibilidad            | 100   | 100    |
| Buenas prácticas         | 100   | 96\*   |
| SEO                      | 100   | 100    |
| First Contentful Paint   | 2.6 s | 0.6 s  |
| Largest Contentful Paint | 3.7 s | 0.8 s  |
| Total Blocking Time      | 1.3 s | 0.18 s |
| Cumulative Layout Shift  | 0.02  | 0.01   |

\*En esa corrida el SSN no respondió y el proxy devolvió 502, que el navegador registra en consola.

El rendimiento en móvil lo limita MapLibre (dibujo WebGL con la CPU 4× más lenta que simula Lighthouse).
Como referencia, el mapa de travesiaunam.com obtiene 55 en la misma prueba. El mapa se carga aparte del resto
para que la interfaz aparezca antes (bundle inicial: 97 KB gzip).

**Peso de la primera visita.** Cloudflare Pages no responde rangos, así que la primera vez se descarga el
mapa base completo (4.6 MB) y luego queda guardado para siempre y sin conexión. Si se sirve el PMTiles desde
un lugar con rangos (por ejemplo un bucket de Cloudflare R2), la app lo detecta sola y pide solo las
teselas que ve (unos cientos de KB al abrir).

## Datos, fuentes y licencias

| Qué                                                     | Fuente                                                                                                     | Licencia / condiciones                                                                                                                                                     |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lugares, polígonos de campus, accesos, Metro y paradas  | © colaboradores de [OpenStreetMap](https://www.openstreetmap.org/copyright)                                | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/). `src/data/*.lugares.json` y `*.limite.json` son una base de datos derivada bajo ODbL.                              |
| Mapa base (`public/mapa/ipn.pmtiles`)                   | Recorte del basemap de [Protomaps](https://docs.protomaps.com/basemaps/downloads) (datos de OpenStreetMap) | ODbL 1.0 (obra producida); atribución «Protomaps © OpenStreetMap», visible siempre en el mapa. Protomaps pide no enlazar sus builds: el recorte se sirve desde este sitio. |
| Estilo del mapa                                         | `@protomaps/basemaps` con colores propios (`src/features/mapa/estilo.ts`) y lector `pmtiles`               | BSD-3-Clause (ambos paquetes).                                                                                                                                             |
| Tipografías de las etiquetas del mapa (`public/glifos`) | Noto Sans (glifos de [basemaps-assets](https://github.com/protomaps/basemaps-assets))                      | SIL Open Font License 1.1 (`public/glifos/OFL.txt`).                                                                                                                       |
| Rutas a pie                                             | OSRM del servidor de [FOSSGIS](https://routing.openstreetmap.de/about.html)                                | Máx. 1 petición/s, sin uso masivo, atribución y enlace «Corregir el mapa». Las coordenadas se envían a ese servidor.                                                       |
| Clima                                                   | [Open-Meteo](https://open-meteo.com/)                                                                      | CC BY 4.0, solo uso no comercial en el plan gratuito.                                                                                                                      |
| Calidad del aire                                        | Open-Meteo con datos de CAMS ([Copernicus](https://atmosphere.copernicus.eu/))                             | CC BY 4.0. Contiene información modificada del Servicio de Monitoreo Atmosférico de Copernicus. Es un modelo, no una estación.                                             |
| Sismos                                                  | [Servicio Sismológico Nacional](http://www.ssn.unam.mx/), UNAM (RSS público)                               | Se cita la fuente y se enlaza. Antes de un uso más amplio, revisa las condiciones del SSN.                                                                                 |
| Tipografías                                             | Inter y Space Grotesk (vía Fontsource)                                                                     | SIL Open Font License 1.1.                                                                                                                                                 |
| Mapa interactivo                                        | [MapLibre GL JS](https://maplibre.org/)                                                                    | BSD-3-Clause.                                                                                                                                                              |

**Licencia del código:** pendiente de elegir por quien mantiene el proyecto (sugerencia: MIT). Hasta que
haya un archivo `LICENSE`, el código no tiene licencia de reutilización.

## Cómo funciona

### Datos

`npm run importar:osm -- <campus>` consulta Overpass y regenera `src/data/<campus>.lugares.json` y
`.limite.json`. Todo lo importado entra con `verificado: false`. Reimportar sobrescribe esos dos archivos
(nunca `servicios.json`): si corriges algo a mano, mejor corrígelo en OpenStreetMap.

### Mapa base

- **Un solo archivo** `public/mapa/ipn.pmtiles` (4.6 MB, zooms 12–15) con la zona navegable de los dos
  campus, servido por el propio sitio: sin servidores de mapas externos ni claves.
- **Regenerarlo** (por ejemplo, cuando OSM tenga cambios o al agregar un campus; ampliar antes la caja en el
  script):

  ```bash
  python3 -m venv .venv-mapa && .venv-mapa/bin/pip install pmtiles
  .venv-mapa/bin/python scripts/extraer_mapa.py        # usa el build diario más reciente de Protomaps
  ```

  Solo descarga los bytes necesarios del planeta (peticiones por rangos). Actualiza
  `src/data/mapa-base.json`, cuya versión cambia la URL del mapa y renueva las copias guardadas.

- **Rangos y Cloudflare Pages**: Pages hoy responde el archivo completo a las peticiones por rango
  ([documentación](https://developers.cloudflare.com/pages/configuration/serving-pages/)). Por eso
  `fuenteMapa.ts` decide con la primera respuesta: si el servidor da rangos (206), pide solo trozos; si da el
  archivo (200), lo baja **una vez** y recorta en memoria; si hay copia guardada, no usa la red.
- **Estilo propio** claro y oscuro (calles legibles, campus teñidos, sin POIs del mapa base que estorben a
  los marcadores). Nombres o siglas bajo los marcadores desde el zoom 16; grupos discretos que se separan
  al acercarse; el edificio del lugar elegido se resalta.
- **Vista 3D** (botón «3D»): edificios con la altura de OSM. **Solo ~1 de cada 8 edificios trae altura**;
  al resto se le pone una estimada de 9 m (unos 3 pisos), así que el 3D es orientativo.
- **Rendimiento**: en pantallas de alta densidad se dibuja a 2× como máximo y sin animaciones de aparición.

### Cómo llegar

- Accesos, Metro y paradas salen de OpenStreetMap con el importador (todo `verificado: false`).
- Rutas a pie: OSRM de FOSSGIS (`https://routing.openstreetmap.de/routed-foot`), con límite de 1 petición/s
  y caché de la sesión.

### Datos en vivo

| Dato             | Fuente                                | Notas                                                                                          |
| ---------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Clima            | [Open-Meteo](https://open-meteo.com/) | Gratis para uso no comercial (CC BY 4.0, atribución obligatoria). Caché 10 min.                |
| Calidad del aire | Open-Meteo, modelo CAMS (Copernicus)  | Estimación de modelo global (~45 km), no una estación. AQI de EE. UU., no IMECA. Caché 30 min. |
| Sismos           | Servicio Sismológico Nacional (RSS)   | El SSN solo ofrece HTTP y sin CORS: se lee a través de `/api/sismos`. Caché 5 min.             |

`/api/sismos` es un proxy mínimo: en desarrollo lo hace Vite (`vite.config.ts`); en producción, la
Pages Function `functions/api/sismos.ts` (probada con `npm run pages:dev`). Si falla, la tarjeta muestra el
error de sismos y el resto sigue funcionando.

### Enchufes y zonas silenciosas

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

### Ocupación reportada por estudiantes

Piloto en **cafeterías y bibliotecas** (`CATEGORIAS_CON_OCUPACION`). Cada persona reporta en un toque
(Vacío / Poca gente / Concurrido / Lleno) y el detalle del lugar muestra la **mediana** de los últimos 45 min.

**Reglas anti-abuso** (en `src/lib/ocupacion.ts`, compartidas por la app y el Worker):
mínimo 3 reportes de al menos 2 dispositivos distintos; 1 reporte por dispositivo y lugar cada 10 min;
máx. 10 reportes/hora por dispositivo y 20/hora por red; los reportes caducan a los 45 min y se borran a las 24 h.
Si no hay suficientes reportes, se dice «sin datos recientes»: no se inventa nada.

**Privacidad:** sin cuentas ni ubicación. El servidor solo guarda un hash del identificador aleatorio del
dispositivo y un hash de la IP con sal diaria (nunca la IP), por 24 h, para frenar abusos.
Conviene publicar un aviso de privacidad propio antes de abrir la función al público.

#### Probar en local

```bash
printf "SAL_SECRETA=cualquier-texto-local\nORIGENES_PERMITIDOS=http://localhost:5173,http://localhost:4173\n" > worker/.dev.vars   # no se sube a git
npm run worker:esquema-local     # crea las tablas en la D1 local
npm run worker:dev               # Worker en http://localhost:8787
echo "VITE_API_OCUPACION=http://localhost:8787" > .env.local
npm run dev                      # reinicia Vite para que lea .env.local
```

**En producción:** `https://rutapoli-ocupacion.rutapoli.workers.dev` (base D1 `rutapoli-ocupacion`; limpieza
diaria a las 03:17 UTC). Pruebas rápidas: `GET /api/salud` → `{"ok":true}`; `GET /api/ocupacion`.

#### Publicar el Worker (necesita una cuenta de Cloudflare)

0. La primera vez, la cuenta necesita un subdominio `workers.dev`: ejecuta el paso 4 en tu terminal y responde
   que sí cuando Wrangler lo pregunte (el enlace de registro del panel puede dar 404).
1. `npx wrangler d1 create rutapoli-ocupacion` y copia el `database_id` a `worker/wrangler.jsonc`.
2. `npx wrangler d1 execute rutapoli-ocupacion --remote --file=worker/schema.sql`
3. `npx wrangler secret put SAL_SECRETA --config worker/wrangler.jsonc` (un texto largo y aleatorio).
4. En `worker/wrangler.jsonc`, pon el dominio real en `ORIGENES_PERMITIDOS` y ejecuta
   `npx wrangler deploy --config worker/wrangler.jsonc`.
5. Al construir el sitio define `VITE_API_OCUPACION=https://<tu-worker>.workers.dev` (por ejemplo en
   `.env.production.local`). Sin esa variable, la función queda oculta. Si el Worker no usa `*.workers.dev`,
   agrega su dominio a `connect-src` en `public/_headers`.

Si cambian los lugares: `npm run importar:osm` y luego `npm run generar:ocupacion` (la prueba avisa si se desincronizan).

**Moderar:** para bloquear un dispositivo o red abusivos, inserta su hash en la tabla `bloqueados`
(`wrangler d1 execute ... --command "INSERT INTO bloqueados VALUES ('<hash>','motivo',<ms>)"`). Los hashes se ven en la tabla `reportes`.

**Costos** (planes gratuitos de Cloudflare, verificados el 13-nov-2026): Workers 100,000 peticiones/día;
D1 5 millones de filas leídas y 100,000 escritas por día, 5 GB. La lectura se cachea 20 s en memoria y 30 s en el navegador.

### Multicampus

Campus disponibles: **Zacatenco** y **Santo Tomás**. El selector de campus cambia centro, polígono, lugares,
filtros y clima sin recargar. Cada campus es su propio conjunto de archivos (`src/data/<id>.*.json`) y se
descarga solo cuando se elige (carga perezosa: cada uno es un chunk aparte en el build). Los enlaces compartidos
llevan el campus (`/?campus=santo-tomas&lugar=id`); si un enlace trae solo `lugar`, la app busca el lugar en los campus.

> Santo Tomás es un multipolígono de 4 parcelas del Casco (OSM `relation/12512609`). Quedan fuera sitios del IPN
> que están separados del Casco, como el CECyT 9. No hay paradas de camión mapeadas cerca en OSM (hoy hay 0);
> los accesos son puertas de OSM sin nombre. Todo está sin verificar.

#### Cómo agregar un campus (ej. «Zacatenco II»)

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

### Diseño de la interfaz

El mapa ocupa toda la pantalla y el resto flota encima:

- **Barra superior** (`App.tsx`): marca, selector de campus, accesos rápidos (escritorio) o buscador (móvil),
  aviso de proyecto no oficial, clima y «¿Dónde estoy?».
- **Panel** (`components/Panel.tsx`): pestañas Lugares · Cómo llegar · Hoy. En escritorio (≥ 56rem) es un panel
  lateral; en móvil es una hoja inferior con tres alturas (mínima, media, expandida). Los tamaños viven en `.panel`
  (`styles/index.css`) y deben coincidir con `rellenoDelMapa()` en `App.tsx`, que le dice al mapa qué zona queda libre.
- **Tokens** (`styles/tokens.css`): colores claro/oscuro, radios, tipografías (Inter para texto, Space Grotesk
  para títulos y cifras) y el punto de corte `desk`. Los componentes solo usan esas clases.
- Los controles de MapLibre (zoom y atribución de OSM) suben con la hoja inferior para no quedar tapados.
