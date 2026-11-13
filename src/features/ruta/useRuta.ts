import { useEffect, useState } from 'react'
import { ErrorRuta, pedirRuta, type Ruta } from '../../lib/ruta'
import type { LatLng } from '../../lib/tipos'

export type EstadoRuta =
  | { fase: 'inactivo' }
  | { fase: 'cargando' }
  | { fase: 'listo'; ruta: Ruta }
  | { fase: 'error'; mensaje: string }

type Resultado = { clave: string; ruta?: Ruta; error?: string }

/** Calcula la ruta a pie cuando hay origen y destino; cancela la petición si cambian. */
export function useRuta(origen: LatLng | null, destino: LatLng | null): EstadoRuta {
  const [oLat, oLng] = origen ?? [NaN, NaN]
  const [dLat, dLng] = destino ?? [NaN, NaN]
  const clave = origen && destino ? `${oLat},${oLng}>${dLat},${dLng}` : null
  const [resultado, setResultado] = useState<Resultado | null>(null)

  useEffect(() => {
    if (clave === null) return
    const control = new AbortController()
    pedirRuta([oLat, oLng], [dLat, dLng], { signal: control.signal })
      .then((ruta) => setResultado({ clave, ruta }))
      .catch((e: unknown) => {
        if (control.signal.aborted) return
        setResultado({
          clave,
          error: e instanceof ErrorRuta ? e.message : 'No se pudo calcular la ruta',
        })
      })
    return () => control.abort()
  }, [clave, oLat, oLng, dLat, dLng])

  if (clave === null) return { fase: 'inactivo' }
  if (resultado?.clave !== clave) return { fase: 'cargando' }
  return resultado.ruta
    ? { fase: 'listo', ruta: resultado.ruta }
    : { fase: 'error', mensaje: resultado.error ?? 'No se pudo calcular la ruta' }
}
