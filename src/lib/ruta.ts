import type { LatLng } from './tipos'

/**
 * Servidor público de rutas a pie: OSRM operado por FOSSGIS (datos de OSM).
 * Política de uso: máx. 1 petición por segundo, sin uso masivo, y mostrar la
 * atribución con enlace para "corregir el mapa". Se probó que permite CORS.
 * (El demo de project-osrm.org no sirve: ignora el perfil y da tiempos de auto.)
 */
export const SERVIDOR_RUTAS = 'https://routing.openstreetmap.de/routed-foot'
export const INTERVALO_MIN_MS = 1100

export type Ruta = {
  distanciaM: number
  duracionS: number
  /** Vértices [lng, lat] (orden GeoJSON). */
  coordenadas: [number, number][]
}

export type CodigoErrorRuta = 'sin-ruta' | 'red' | 'servidor' | 'formato'

export class ErrorRuta extends Error {
  codigo: CodigoErrorRuta
  constructor(codigo: CodigoErrorRuta, mensaje: string) {
    super(mensaje)
    this.name = 'ErrorRuta'
    this.codigo = codigo
  }
}

export function urlRuta(origen: LatLng, destino: LatLng): string {
  const par = ([lat, lng]: LatLng) => `${lng},${lat}`
  return `${SERVIDOR_RUTAS}/route/v1/foot/${par(origen)};${par(destino)}?overview=full&geometries=geojson&steps=false`
}

/** Valida y extrae la primera ruta de una respuesta de OSRM. */
export function leerRespuestaRuta(json: unknown): Ruta {
  if (typeof json !== 'object' || json === null)
    throw new ErrorRuta('formato', 'Respuesta vacía')
  const r = json as { code?: string; routes?: unknown[] }
  if (r.code === 'NoRoute')
    throw new ErrorRuta('sin-ruta', 'No hay ruta a pie entre esos puntos')
  if (r.code !== 'Ok' || !Array.isArray(r.routes) || r.routes.length === 0)
    throw new ErrorRuta('formato', `Respuesta inesperada (${r.code ?? 'sin código'})`)
  const ruta = r.routes[0] as {
    distance?: unknown
    duration?: unknown
    geometry?: { coordinates?: unknown }
  }
  const coords = ruta.geometry?.coordinates
  if (
    typeof ruta.distance !== 'number' ||
    typeof ruta.duration !== 'number' ||
    !Array.isArray(coords) ||
    coords.length < 2 ||
    !coords.every(
      (c) => Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number',
    )
  )
    throw new ErrorRuta('formato', 'La ruta llegó incompleta')
  return {
    distanciaM: ruta.distance,
    duracionS: ruta.duration,
    coordenadas: coords as [number, number][],
  }
}

type Opciones = {
  signal?: AbortSignal
  fetcher?: typeof fetch
  intervaloMs?: number
}

const cache = new Map<string, Ruta>()
let ultimaPeticion = 0

/** Pide la ruta a pie. Respeta 1 petición/segundo y recuerda resultados de la sesión. */
export async function pedirRuta(
  origen: LatLng,
  destino: LatLng,
  { signal, fetcher = fetch, intervaloMs = INTERVALO_MIN_MS }: Opciones = {},
): Promise<Ruta> {
  const url = urlRuta(origen, destino)
  const guardada = cache.get(url)
  if (guardada) return guardada

  const espera = ultimaPeticion + intervaloMs - Date.now()
  if (espera > 0) await new Promise((r) => setTimeout(r, espera))
  signal?.throwIfAborted()
  ultimaPeticion = Date.now()

  let res: Response
  try {
    res = await fetcher(url, {
      signal: AbortSignal.any(
        [signal, AbortSignal.timeout(12000)].filter((s) => s !== undefined),
      ),
    })
  } catch (e) {
    if (signal?.aborted) throw e
    throw new ErrorRuta('red', 'No se pudo conectar con el servicio de rutas')
  }
  // OSRM manda el código "NoRoute" en el cuerpo, a veces con estado 400.
  const cuerpo: unknown = await res.json().catch(() => null)
  if (!res.ok && (cuerpo as { code?: string } | null)?.code !== 'NoRoute') {
    throw new ErrorRuta(
      'servidor',
      res.status === 429
        ? 'Demasiadas peticiones; espera unos segundos'
        : `El servicio respondió ${res.status}`,
    )
  }
  const ruta = leerRespuestaRuta(cuerpo)
  cache.set(url, ruta)
  return ruta
}

export function formatearDistancia(m: number): string {
  return m < 1000
    ? `${Math.max(10, Math.round(m / 10) * 10)} m`
    : `${(m / 1000).toFixed(1)} km`
}

/** Tiempo aproximado a pie: "≈ 5 min", "≈ 1 h 5 min". */
export function formatearDuracion(s: number): string {
  const total = Math.max(1, Math.round(s / 60))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `≈ ${total} min`
  return m === 0 ? `≈ ${h} h` : `≈ ${h} h ${m} min`
}

export type RutaGeoJSON = {
  type: 'FeatureCollection'
  features: (
    | {
        type: 'Feature'
        properties: { rol: 'ruta' }
        geometry: { type: 'LineString'; coordinates: [number, number][] }
      }
    | {
        type: 'Feature'
        properties: { rol: 'origen' | 'destino' }
        geometry: { type: 'Point'; coordinates: [number, number] }
      }
  )[]
}

export const RUTA_VACIA: RutaGeoJSON = { type: 'FeatureCollection', features: [] }

/** Línea de la ruta más los puntos de origen y destino elegidos por la persona. */
export function rutaAGeoJSON(ruta: Ruta, origen: LatLng, destino: LatLng): RutaGeoJSON {
  const punto = (rol: 'origen' | 'destino', [lat, lng]: LatLng) => ({
    type: 'Feature' as const,
    properties: { rol },
    geometry: { type: 'Point' as const, coordinates: [lng, lat] as [number, number] },
  })
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { rol: 'ruta' },
        geometry: { type: 'LineString', coordinates: ruta.coordenadas },
      },
      punto('origen', origen),
      punto('destino', destino),
    ],
  }
}
