import { useSyncExternalStore } from 'react'
import mapaBase from '../../data/mapa-base.json'
import { RUTA_MAPA } from './estilo'
import { FuenteMapa } from './fuenteMapa'

/**
 * Mapa base: lectura y copia para usarlo sin conexión.
 *
 * `fuenteMapa` entrega a MapLibre los trozos del PMTiles (ver fuenteMapa.ts). Cuando el
 * mapa ya cargó, se guarda una copia completa (~4.6 MB) en la caché `mapa-base`; desde
 * ahí se lee en las visitas siguientes y sin conexión. Si el archivo ya se había bajado
 * completo (servidores sin rangos, como Cloudflare Pages), se guarda ese mismo, sin
 * descargarlo otra vez. No se guarda si el navegador pide ahorrar datos.
 */
export const CACHE_MAPA = 'mapa-base'
export const BYTES_MAPA = mapaBase.bytes
const URL_MAPA = `${window.location.origin}${RUTA_MAPA}`

async function leerCopia(): Promise<ArrayBuffer | null> {
  try {
    if (!('caches' in window)) return null
    const r = await (await caches.open(CACHE_MAPA)).match(URL_MAPA)
    return r ? await r.arrayBuffer() : null
  } catch {
    return null
  }
}

/** Fuente única del mapa base (su clave es la URL del estilo: pmtiles://<URL_MAPA>). */
export const fuenteMapa = new FuenteMapa(URL_MAPA, { leerCopia })

export type EstadoMapaOffline =
  'sin-soporte' | 'pendiente' | 'guardando' | 'guardado' | 'ahorro' | 'error'

let estado: EstadoMapaOffline = 'pendiente'
const oyentes = new Set<() => void>()
function fijar(e: EstadoMapaOffline) {
  estado = e
  oyentes.forEach((o) => o())
}

type ConexionNavegador = { saveData?: boolean }

/** Guarda el mapa base si aún no está; borra versiones anteriores. Nunca lanza. */
export async function guardarMapaOffline(): Promise<EstadoMapaOffline> {
  if (estado === 'guardando' || estado === 'guardado') return estado
  if (!('caches' in window) || !('serviceWorker' in navigator)) {
    fijar('sin-soporte')
    return estado
  }
  try {
    const cache = await caches.open(CACHE_MAPA)
    const url = URL_MAPA
    for (const r of await cache.keys()) if (r.url !== url) await cache.delete(r)
    if (await cache.match(url)) {
      fijar('guardado')
      return estado
    }
    if (
      (navigator as Navigator & { connection?: ConexionNavegador }).connection?.saveData
    ) {
      fijar('ahorro')
      return estado
    }
    fijar('guardando')
    const completo = await fuenteMapa.archivoCompleto()
    if (completo)
      await cache.put(
        url,
        new Response(completo, {
          headers: { 'Content-Type': 'application/octet-stream' },
        }),
      )
    else await cache.add(url)
    fijar('guardado')
  } catch {
    fijar('error')
  }
  return estado
}

function suscribir(o: () => void) {
  oyentes.add(o)
  return () => oyentes.delete(o)
}

export function useEstadoMapaOffline(): EstadoMapaOffline {
  return useSyncExternalStore(
    suscribir,
    () => estado,
    () => 'pendiente',
  )
}
