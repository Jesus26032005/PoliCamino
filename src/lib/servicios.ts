import {
  VALORES_ENCHUFES,
  VALORES_SILENCIO,
  type Atributo,
  type Lugar,
  type Servicios,
} from './tipos.ts'

export const ETIQUETA_ENCHUFES = {
  muchos: 'Hay varios enchufes',
  pocos: 'Hay pocos enchufes',
  no: 'No hay enchufes',
} as const
export const ETIQUETA_SILENCIO = {
  silencioso: 'Zona silenciosa',
  moderado: 'Ruido moderado',
  ruidoso: 'Zona ruidosa',
} as const

/** Aportes por id de lugar: es lo que contiene `<campus>.servicios.json`. */
export type Aportes = Record<string, Servicios>

function validarAtributo(
  x: unknown,
  valores: readonly string[],
  nombre: string,
): string[] {
  if (typeof x !== 'object' || x === null) return [`${nombre}: debe ser un objeto`]
  const a = x as Partial<Atributo<string>>
  const e: string[] = []
  if (!valores.includes(a.valor as string))
    e.push(`${nombre}: valor inválido (${valores.join(' | ')})`)
  if (typeof a.fuente !== 'string' || !a.fuente.trim())
    e.push(`${nombre}: falta la fuente`)
  if (
    typeof a.fecha !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(a.fecha) ||
    Number.isNaN(Date.parse(a.fecha))
  )
    e.push(`${nombre}: la fecha debe ser AAAA-MM-DD`)
  if (typeof a.verificado !== 'boolean')
    e.push(`${nombre}: falta verificado (true/false)`)
  return e
}

/** Problemas de un archivo de aportes (vacío si es válido). `ids` son los lugares existentes. */
export function validarAportes(x: unknown, ids: ReadonlySet<string>): string[] {
  if (typeof x !== 'object' || x === null || Array.isArray(x))
    return ['El archivo de servicios debe ser un objeto { "id-del-lugar": {...} }']
  const e: string[] = []
  for (const [id, v] of Object.entries(x)) {
    if (!ids.has(id)) {
      e.push(`${id}: ese lugar no existe`)
      continue
    }
    const s = v as Servicios
    if (typeof s !== 'object' || s === null) {
      e.push(`${id}: debe ser un objeto`)
      continue
    }
    if (s.enchufes === undefined && s.silencio === undefined)
      e.push(`${id}: no trae enchufes ni silencio`)
    if (s.enchufes !== undefined)
      e.push(...validarAtributo(s.enchufes, VALORES_ENCHUFES, `${id}.enchufes`))
    if (s.silencio !== undefined)
      e.push(...validarAtributo(s.silencio, VALORES_SILENCIO, `${id}.silencio`))
  }
  return e
}

/** Une los aportes a los lugares; lanza un error claro si el archivo está mal. */
export function aplicarServicios(lugares: Lugar[], aportes: unknown): Lugar[] {
  const problemas = validarAportes(aportes, new Set(lugares.map((l) => l.id)))
  if (problemas.length)
    throw new Error(`Datos de servicios inválidos:\n${problemas.join('\n')}`)
  const mapa = aportes as Aportes
  return lugares.map((l) => (mapa[l.id] ? { ...l, servicios: mapa[l.id] } : l))
}

export type FiltroServicios = { enchufes: boolean; silencio: boolean }

export const tieneEnchufes = (l: Lugar) =>
  l.servicios?.enchufes?.valor === 'muchos' || l.servicios?.enchufes?.valor === 'pocos'
export const esSilencioso = (l: Lugar) => l.servicios?.silencio?.valor === 'silencioso'

export function filtrarPorServicios(lugares: Lugar[], f: FiltroServicios): Lugar[] {
  return lugares.filter(
    (l) => (!f.enchufes || tieneEnchufes(l)) && (!f.silencio || esSilencioso(l)),
  )
}

/**
 * Enlace para abrir un issue de GitHub ya redactado con el lugar. Devuelve null si
 * no hay repositorio configurado (no se inventa una dirección).
 */
export function enlaceSugerencia(lugar: Lugar, repositorio: string): string | null {
  const base = repositorio.trim().replace(/\/+$/, '')
  if (!base) return null
  const cuerpo = [
    `Lugar: ${lugar.nombre}`,
    `Id: ${lugar.id}`,
    '',
    'Enchufes (muchos / pocos / no):',
    'Silencio (silencioso / moderado / ruidoso):',
    'Cómo lo comprobaste y cuándo (fecha):',
  ].join('\n')
  const p = new URLSearchParams({
    title: `Aporte: enchufes y silencio en ${lugar.nombre}`,
    body: cuerpo,
  })
  return `${base}/issues/new?${p}`
}
