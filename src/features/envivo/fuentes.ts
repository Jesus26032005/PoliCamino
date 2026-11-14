import { conCache, type Entrada } from '../../lib/cache'
import {
  ErrorEnVivo,
  leerAire,
  leerClima,
  leerSismosSsn,
  urlAire,
  urlClima,
  type Aire,
  type Clima,
  type Sismo,
} from '../../lib/envivo'
import type { LatLng } from '../../lib/tipos'

const MIN = 60_000
// Cuánto dura cada dato en la caché del navegador (el clima cambia más rápido que el aire).
export const TTL = { clima: 10 * MIN, aire: 30 * MIN, sismos: 5 * MIN }

export type Cargador<T> = (signal: AbortSignal, forzar: boolean) => Promise<Entrada<T>>

async function pedir(url: string, signal: AbortSignal): Promise<Response> {
  let res: Response
  try {
    res = await fetch(url, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
    })
  } catch (e) {
    if (signal.aborted) throw e
    throw new ErrorEnVivo('Sin conexión con el servicio')
  }
  if (!res.ok)
    throw new ErrorEnVivo(
      res.status === 429
        ? 'Demasiadas consultas; intenta en un momento'
        : `El servicio respondió ${res.status}`,
    )
  return res
}

const json = async (url: string, signal: AbortSignal): Promise<unknown> => {
  const res = await pedir(url, signal)
  try {
    return await res.json()
  } catch {
    throw new ErrorEnVivo('La respuesta no se pudo leer')
  }
}

export const cargarClima =
  (centro: LatLng): Cargador<Clima> =>
  (signal, forzar) =>
    conCache(
      `clima:${centro.join(',')}`, // la clave incluye el campus: cada uno tiene su clima
      TTL.clima,
      async () => leerClima(await json(urlClima(centro), signal)),
      { forzar },
    )

export const cargarAire =
  (centro: LatLng): Cargador<Aire> =>
  (signal, forzar) =>
    conCache(
      `aire:${centro.join(',')}`,
      TTL.aire,
      async () => leerAire(await json(urlAire(centro), signal)),
      { forzar },
    )

/** Pasa por `/api/sismos` (proxy propio): el SSN no permite leerlo directo desde el navegador. */
export const cargarSismos: Cargador<Sismo[]> = (signal, forzar) =>
  conCache(
    'sismos',
    TTL.sismos,
    async () =>
      leerSismosSsn(
        await (await pedir(`${import.meta.env.BASE_URL}api/sismos`, signal)).text(),
      ),
    { forzar },
  )
