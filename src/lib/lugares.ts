import { aplicarServicios } from './servicios'
import { CATEGORIAS, type CampusId, type Lugar } from './tipos'

/** Devuelve la lista de problemas de un lugar (vacía si es válido). */
export function validarLugar(x: unknown): string[] {
  const e: string[] = []
  if (typeof x !== 'object' || x === null) return ['no es un objeto']
  const l = x as Record<string, unknown>
  const id = typeof l.id === 'string' && l.id ? l.id : '?'
  const err = (m: string) => e.push(`${id}: ${m}`)

  if (typeof l.id !== 'string' || !l.id) err('falta id')
  if (typeof l.nombre !== 'string' || !l.nombre.trim()) err('falta nombre')
  if (l.campusId !== 'zacatenco' && l.campusId !== 'santo-tomas') err('campusId inválido')
  if (!CATEGORIAS.includes(l.categoria as never)) err('categoría inválida')
  const c = l.coordenadas
  if (
    !Array.isArray(c) ||
    c.length !== 2 ||
    !c.every((n) => typeof n === 'number' && Number.isFinite(n)) ||
    Math.abs(c[0]) > 90 ||
    Math.abs(c[1]) > 180
  )
    err('coordenadas inválidas')
  if (typeof l.verificado !== 'boolean') err('falta verificado')
  // Regla del proyecto: ningún dato sin fuente.
  const fuente = typeof l.fuente === 'string' && l.fuente.trim() !== ''
  if (l.verificado === true && !fuente) err('verificado sin fuente')
  if (l.horario !== undefined && !fuente) err('horario sin fuente')
  if (
    l.alias !== undefined &&
    !(Array.isArray(l.alias) && l.alias.every((a) => typeof a === 'string'))
  )
    err('alias inválido')
  return e
}

/** Valida una lista completa; lanza un error con todos los problemas. */
export function validarLugares(x: unknown): Lugar[] {
  if (!Array.isArray(x)) throw new Error('Los lugares deben ser una lista')
  const problemas = x.flatMap(validarLugar)
  const vistos = new Set<string>()
  for (const l of x as Lugar[]) {
    if (vistos.has(l.id)) problemas.push(`${l.id}: id repetido`)
    vistos.add(l.id)
  }
  if (problemas.length)
    throw new Error(`Datos de lugares inválidos:\n${problemas.join('\n')}`)
  return x as Lugar[]
}

/** Carga perezosa por campus: cada campus es su propio archivo. */
const CARGADORES: Partial<Record<CampusId, () => Promise<{ default: unknown }>>> = {
  zacatenco: () => import('../data/zacatenco.lugares.json'),
}

const CARGADORES_SERVICIOS: Partial<
  Record<CampusId, () => Promise<{ default: unknown }>>
> = {
  zacatenco: () => import('../data/zacatenco.servicios.json'),
}

export async function cargarLugares(campusId: CampusId): Promise<Lugar[]> {
  const cargar = CARGADORES[campusId]
  if (!cargar) throw new Error(`Aún no hay datos para el campus "${campusId}"`)
  const [lugares, servicios] = await Promise.all([
    cargar(),
    CARGADORES_SERVICIOS[campusId]?.() ?? Promise.resolve({ default: {} }),
  ])
  return aplicarServicios(validarLugares(lugares.default), servicios.default)
}

export type LugaresGeoJSON = {
  type: 'FeatureCollection'
  features: {
    type: 'Feature'
    id: number
    geometry: { type: 'Point'; coordinates: [number, number] }
    properties: { id: string; nombre: string; categoria: string; verificado: boolean }
  }[]
}

/** GeoJSON usa [lng, lat], al revés que nuestras coordenadas. */
export function lugaresAGeoJSON(lugares: Lugar[]): LugaresGeoJSON {
  return {
    type: 'FeatureCollection',
    features: lugares.map((l, i) => ({
      type: 'Feature',
      id: i,
      geometry: { type: 'Point', coordinates: [l.coordenadas[1], l.coordenadas[0]] },
      properties: {
        id: l.id,
        nombre: l.nombre,
        categoria: l.categoria,
        verificado: l.verificado,
      },
    })),
  }
}
