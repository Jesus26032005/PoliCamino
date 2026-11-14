import { conCache, type Entrada } from '../../lib/cache'
import { ErrorEnVivo } from '../../lib/envivo'
import {
  ENFRIAMIENTO_MS,
  leerRespuestaOcupacion,
  type Nivel,
  type RespuestaOcupacion,
} from '../../lib/ocupacion'

/** Dirección del Worker (VITE_API_OCUPACION). Vacío = la función de ocupación queda oculta. */
export const API_OCUPACION: string = (import.meta.env.VITE_API_OCUPACION ?? '').replace(
  /\/+$/,
  '',
)

const CLAVE_DISPOSITIVO = 'rutapoli:dispositivo'
let dispositivoEnMemoria: string | null = null

/** Identificador aleatorio y anónimo del dispositivo (no es el IMEI ni nada del equipo). */
export function dispositivoId(): string {
  try {
    const guardado = localStorage.getItem(CLAVE_DISPOSITIVO)
    if (guardado) return guardado
    const nuevo = crypto.randomUUID()
    localStorage.setItem(CLAVE_DISPOSITIVO, nuevo)
    return nuevo
  } catch {
    // Sin almacenamiento (modo privado): vale para esta sesión.
    return (dispositivoEnMemoria ??= crypto.randomUUID())
  }
}

const claveReporte = (lugarId: string) => `rutapoli:reporte:${lugarId}`

/** Minutos que faltan para poder reportar de nuevo este lugar (0 = ya se puede). */
export function minutosDeEspera(lugarId: string, ahora = Date.now()): number {
  try {
    const ultimo = Number(localStorage.getItem(claveReporte(lugarId)))
    if (!ultimo) return 0
    return Math.max(0, Math.ceil((ultimo + ENFRIAMIENTO_MS - ahora) / 60_000))
  } catch {
    return 0
  }
}

export const cargarOcupacion = (
  signal: AbortSignal,
  forzar: boolean,
): Promise<Entrada<RespuestaOcupacion>> =>
  conCache(
    'ocupacion',
    60_000,
    async () => {
      let res: Response
      try {
        res = await fetch(`${API_OCUPACION}/api/ocupacion`, {
          signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
          // Tras reportar, hay que ver el dato nuevo y no la copia que el navegador guardó.
          cache: forzar ? 'no-cache' : 'default',
        })
      } catch (e) {
        if (signal.aborted) throw e
        throw new ErrorEnVivo('Sin conexión con el servicio de ocupación')
      }
      if (!res.ok) throw new ErrorEnVivo(`El servicio respondió ${res.status}`)
      try {
        return leerRespuestaOcupacion(await res.json())
      } catch {
        throw new ErrorEnVivo('La respuesta de ocupación no se pudo leer')
      }
    },
    { forzar },
  )

/** Envía un reporte anónimo. Lanza ErrorEnVivo con un mensaje listo para mostrar. */
export async function enviarReporte(lugarId: string, nivel: Nivel): Promise<void> {
  let res: Response
  try {
    res = await fetch(`${API_OCUPACION}/api/reportes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lugarId, nivel, dispositivo: dispositivoId() }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    throw new ErrorEnVivo('No se pudo enviar: revisa tu conexión')
  }
  if (res.status === 429)
    throw new ErrorEnVivo('Ya reportaste hace poco. Intenta más tarde')
  if (res.status === 403)
    throw new ErrorEnVivo('Este dispositivo no puede enviar reportes')
  if (!res.ok) throw new ErrorEnVivo('No se pudo enviar el reporte. Intenta de nuevo')
  try {
    localStorage.setItem(claveReporte(lugarId), String(Date.now()))
  } catch {
    /* sin almacenamiento: el servidor igual limita */
  }
}
