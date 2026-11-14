import type { Categoria } from './tipos.ts'

/**
 * Lógica de ocupación reportada por estudiantes. Es pura y la usan tanto la app
 * como el Worker (worker/), así hay una sola fuente de verdad para las reglas.
 */

export const NIVELES = [1, 2, 3, 4] as const
export type Nivel = (typeof NIVELES)[number]
export const ETIQUETA_NIVEL: Record<Nivel, string> = {
  1: 'Vacío',
  2: 'Poca gente',
  3: 'Concurrido',
  4: 'Lleno',
}

/** Categorías del piloto: solo ahí se piden y muestran reportes. */
export const CATEGORIAS_CON_OCUPACION: readonly Categoria[] = ['cafeteria', 'biblioteca']

// Reglas (iguales en cliente y servidor). Los reportes caducan para no mostrar datos viejos.
export const VENTANA_MS = 45 * 60_000
export const MIN_REPORTES = 3
export const MIN_DISPOSITIVOS = 2
export const ENFRIAMIENTO_MS = 10 * 60_000 // mismo dispositivo y lugar
export const MAX_POR_DISPOSITIVO_HORA = 10
export const MAX_POR_IP_HORA = 20
export const RETENCION_MS = 24 * 3_600_000

export type ReporteBasico = {
  lugarId: string
  nivel: Nivel
  creado: number
  /** Identificador del dispositivo (en el servidor ya va con hash). */
  dispositivo: string
}

export type OcupacionLugar = { nivel: Nivel; reportes: number; ultimo: number }

export type RespuestaOcupacion = {
  generado: number
  ventanaMin: number
  /** Solo lugares con suficientes reportes recientes; el resto = sin datos. */
  lugares: Record<string, OcupacionLugar>
}

export const esNivel = (n: unknown): n is Nivel => NIVELES.includes(n as Nivel)

/** Mediana de niveles; si cae entre dos (ej. 2.5) se redondea hacia arriba. */
export function medianaNivel(niveles: number[]): Nivel {
  const s = [...niveles].sort((a, b) => a - b)
  const m =
    s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
  return Math.min(4, Math.max(1, Math.round(m))) as Nivel
}

/**
 * Agrega reportes por lugar usando solo la ventana reciente. Se exige un mínimo de
 * reportes y de dispositivos distintos: una sola persona no puede fijar el resultado.
 */
export function agregarOcupacion(
  reportes: ReporteBasico[],
  ahora: number,
): Record<string, OcupacionLugar> {
  const porLugar = new Map<string, ReporteBasico[]>()
  for (const r of reportes) {
    if (r.creado > ahora || ahora - r.creado > VENTANA_MS) continue
    porLugar.set(r.lugarId, [...(porLugar.get(r.lugarId) ?? []), r])
  }
  const salida: Record<string, OcupacionLugar> = {}
  for (const [lugarId, rs] of porLugar) {
    if (rs.length < MIN_REPORTES) continue
    if (new Set(rs.map((r) => r.dispositivo)).size < MIN_DISPOSITIVOS) continue
    salida[lugarId] = {
      nivel: medianaNivel(rs.map((r) => r.nivel)),
      reportes: rs.length,
      ultimo: Math.max(...rs.map((r) => r.creado)),
    }
  }
  return salida
}

const RE_ID_LUGAR = /^[a-z0-9-]{1,64}$/
const RE_DISPOSITIVO = /^[A-Za-z0-9-]{16,64}$/

export type ReporteValidado =
  | { ok: true; lugarId: string; nivel: Nivel; dispositivo: string }
  | { ok: false; error: string }

/** Valida el cuerpo de un reporte recibido (JSON desconocido). */
export function validarReporte(x: unknown): ReporteValidado {
  if (typeof x !== 'object' || x === null || Array.isArray(x))
    return { ok: false, error: 'El reporte debe ser un objeto' }
  const r = x as Record<string, unknown>
  if (typeof r.lugarId !== 'string' || !RE_ID_LUGAR.test(r.lugarId))
    return { ok: false, error: 'lugarId inválido' }
  if (!esNivel(r.nivel)) return { ok: false, error: 'nivel debe ser 1, 2, 3 o 4' }
  if (typeof r.dispositivo !== 'string' || !RE_DISPOSITIVO.test(r.dispositivo))
    return { ok: false, error: 'dispositivo inválido' }
  return { ok: true, lugarId: r.lugarId, nivel: r.nivel, dispositivo: r.dispositivo }
}

/** Lee la respuesta de GET /api/ocupacion; lanza si el formato no es el esperado. */
export function leerRespuestaOcupacion(json: unknown): RespuestaOcupacion {
  const j = json as Partial<RespuestaOcupacion> | null
  if (
    !j ||
    typeof j.generado !== 'number' ||
    typeof j.lugares !== 'object' ||
    j.lugares === null
  )
    throw new Error('La respuesta de ocupación llegó incompleta')
  const lugares: Record<string, OcupacionLugar> = {}
  for (const [id, v] of Object.entries(j.lugares)) {
    if (
      v &&
      esNivel(v.nivel) &&
      typeof v.reportes === 'number' &&
      typeof v.ultimo === 'number'
    )
      lugares[id] = { nivel: v.nivel, reportes: v.reportes, ultimo: v.ultimo }
  }
  return {
    generado: j.generado,
    ventanaMin: typeof j.ventanaMin === 'number' ? j.ventanaMin : VENTANA_MS / 60_000,
    lugares,
  }
}

/** ¿Este lugar participa en el piloto de ocupación? */
export const admiteOcupacion = (categoria: Categoria) =>
  CATEGORIAS_CON_OCUPACION.includes(categoria)
