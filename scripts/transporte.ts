import type { Lugar } from '../src/lib/tipos.ts'
import type { TagsOSM } from './clasificar.ts'
import { distanciaAlAnillo, distanciaAlBorde, distanciaMetros } from './geometria.ts'

export type ElementoOSM = {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: TagsOSM
}

type Punto = { lat: number; lng: number }

// Distancias máximas (en línea recta) al borde del campus.
export const MAX_ACCESO_M = 30
export const MAX_PARADA_M = 250
export const MAX_ESTACION_BUS_M = 700
export const MAX_METRO_M = 1000
const FUSION_M = 30

const prefijo = { node: 'n', way: 'w', relation: 'r' } as const
const redondear = (m: number) => Math.round(m / 10) * 10

function punto(e: ElementoOSM): Punto | null {
  const lat = e.lat ?? e.center?.lat
  const lng = e.lon ?? e.center?.lon
  return lat === undefined || lng === undefined ? null : { lat, lng }
}

function base(
  e: ElementoOSM,
  p: Punto,
  hoy: string,
  extra: Pick<Lugar, 'nombre' | 'categoria' | 'descripcion'>,
): Lugar {
  return {
    id: `osm-${prefijo[e.type]}${e.id}`,
    campusId: 'zacatenco',
    coordenadas: [Number(p.lat.toFixed(6)), Number(p.lng.toFixed(6))],
    fuente: `OpenStreetMap ${e.type}/${e.id} (ODbL), consultado ${hoy}`,
    verificado: false,
    osmId: `${e.type}/${e.id}`,
    actualizado: hoy,
    ...extra,
  }
}

/** Frase de ubicación respecto al campus (0 m = dentro del polígono de OSM). */
export function textoDistancia(metrosAlCampus: number): string {
  if (metrosAlCampus === 0) return 'Dentro del campus.'
  const m = redondear(metrosAlCampus)
  return m === 0
    ? 'Junto al límite del campus.'
    : `A unos ${m} m del campus en línea recta.`
}

const esTrolebus = (t: TagsOSM) =>
  /troleb/i.test(`${t.operator ?? ''} ${t.network ?? ''}`)

/**
 * Convierte puertas, estaciones y paradas de OSM en lugares de categoría
 * "acceso" y "transporte", filtrando por distancia al campus.
 */
export function construirAccesosYTransporte(
  puertas: ElementoOSM[],
  transporte: ElementoOSM[],
  anillo: Punto[],
  hoy: string,
): Lugar[] {
  const lugares: Lugar[] = []

  // --- Metro, estaciones de autobuses y paradas ---
  const nombresVistos = new Set<string>()
  const paradas: { lugar: Lugar; p: Punto }[] = []

  for (const e of transporte) {
    const t = e.tags ?? {}
    const p = punto(e)
    if (!p || !t.name) continue
    const d = distanciaAlAnillo(p, anillo)
    const aprox = textoDistancia(d)

    if (t.railway === 'station' && t.station === 'subway') {
      const nombre = `Metro ${t.name.replace(/\s+L\d+$/, '')}`
      if (d > MAX_METRO_M || nombresVistos.has(nombre)) continue
      nombresVistos.add(nombre)
      lugares.push(
        base(e, p, hoy, {
          nombre,
          categoria: 'transporte',
          descripcion: `Estación del Metro (STC). ${aprox}`,
        }),
      )
    } else if (t.amenity === 'bus_station') {
      if (d > MAX_ESTACION_BUS_M || nombresVistos.has(t.name)) continue
      nombresVistos.add(t.name)
      const op = esTrolebus(t) ? ' de trolebús' : ' de autobuses'
      lugares.push(
        base(e, p, hoy, {
          nombre: t.name,
          categoria: 'transporte',
          descripcion: `Estación${op}. ${aprox}`,
        }),
      )
    } else if (e.type === 'node' && t.highway === 'bus_stop') {
      if (d > MAX_PARADA_M) continue
      const nombre = `Parada ${t.name}`
      // Mismo nombre a menos de 15 m: es la misma parada mapeada dos veces.
      if (paradas.some((x) => x.lugar.nombre === nombre && distanciaMetros(x.p, p) < 15))
        continue
      const tipo = esTrolebus(t) ? 'trolebús' : 'transporte público'
      const lugar = base(e, p, hoy, {
        nombre,
        categoria: 'transporte',
        descripcion: `Parada de ${tipo} (según OSM). ${aprox}`,
      })
      paradas.push({ lugar, p })
      lugares.push(lugar)
    }
  }

  // --- Accesos: puertas/barreras sobre el borde del campus ---
  const candidatas = puertas
    .map((e) => ({ e, p: punto(e) }))
    .filter((x): x is { e: ElementoOSM; p: Punto } => {
      const t = x.e.tags ?? {}
      return (
        x.p !== null &&
        ['gate', 'lift_gate'].includes(t.barrier ?? '') &&
        !['no', 'private'].includes(t.access ?? '') &&
        distanciaAlBorde(x.p, anillo) <= MAX_ACCESO_M
      )
    })
    .sort((a, b) => a.e.id - b.e.id)

  // Puerta + pluma suelen estar mapeadas juntas: se fusionan en un solo acceso.
  const grupos: { e: ElementoOSM; ps: Punto[]; ids: string[] }[] = []
  for (const c of candidatas) {
    const g = grupos.find((g) => g.ps.some((q) => distanciaMetros(q, c.p) <= FUSION_M))
    if (g) {
      g.ps.push(c.p)
      g.ids.push(`${c.e.type}/${c.e.id}`)
    } else grupos.push({ e: c.e, ps: [c.p], ids: [`${c.e.type}/${c.e.id}`] })
  }

  const usados = new Map<string, number>()
  grupos.forEach((g, i) => {
    const centro = {
      lat: g.ps.reduce((s, q) => s + q.lat, 0) / g.ps.length,
      lng: g.ps.reduce((s, q) => s + q.lng, 0) / g.ps.length,
    }
    const cercana = paradas
      .map((x) => ({ x, d: distanciaMetros(x.p, centro) }))
      .filter((c) => c.d <= 200)
      .sort((a, b) => a.d - b.d)[0]
    let nombre = cercana
      ? `Acceso cerca de «${cercana.x.lugar.nombre.replace(/^Parada /, '')}»`
      : `Acceso ${i + 1}`
    const n = (usados.get(nombre) ?? 0) + 1
    usados.set(nombre, n)
    if (n > 1) nombre += ` (${n})`
    lugares.push({
      ...base(g.e, centro, hoy, {
        nombre,
        categoria: 'acceso',
        descripcion:
          'Puerta o barrera mapeada en OpenStreetMap sobre el borde del campus, sin nombre ni horario. Falta confirmar si es de uso peatonal o vehicular y cuándo abre.',
      }),
      fuente: `OpenStreetMap ${g.ids.join(', ')} (ODbL), consultado ${hoy}`,
    })
  })

  return lugares
}
