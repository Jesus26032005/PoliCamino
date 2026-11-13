import { useEffect, useState } from 'react'
import type { Entrada } from '../../lib/cache'
import { ErrorEnVivo } from '../../lib/envivo'
import type { Cargador } from './fuentes'

export type EstadoFuente<T> =
  | { fase: 'cargando' }
  | { fase: 'listo'; datos: T; consultadoEn: number }
  | { fase: 'error'; mensaje: string }

type Resultado<T> = { version: number; entrada?: Entrada<T>; error?: string }

/**
 * Carga un dato en vivo. Cada fuente tiene su propio estado, así que si una falla
 * las demás siguen funcionando. `cargar` debe ser estable (useMemo/useCallback).
 */
export function useFuente<T>(cargar: Cargador<T>) {
  const [version, setVersion] = useState(0)
  const [resultado, setResultado] = useState<Resultado<T> | null>(null)

  useEffect(() => {
    const control = new AbortController()
    cargar(control.signal, version > 0)
      .then((entrada) => setResultado({ version, entrada }))
      .catch((e: unknown) => {
        if (control.signal.aborted) return
        setResultado({
          version,
          error: e instanceof ErrorEnVivo ? e.message : 'No se pudo obtener el dato',
        })
      })
    return () => control.abort()
  }, [cargar, version])

  let estado: EstadoFuente<T>
  if (resultado?.version !== version) estado = { fase: 'cargando' }
  else if (resultado.entrada)
    estado = {
      fase: 'listo',
      datos: resultado.entrada.datos,
      consultadoEn: resultado.entrada.consultadoEn,
    }
  else
    estado = { fase: 'error', mensaje: resultado.error ?? 'No se pudo obtener el dato' }

  return { estado, recargar: () => setVersion((v) => v + 1) }
}
