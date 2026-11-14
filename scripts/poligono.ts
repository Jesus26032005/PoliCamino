import type { Punto } from './geometria.ts'

type ConGeometria = { lat: number; lon: number }[]
export type ElementoPoligono = {
  type: 'way' | 'relation'
  id: number
  geometry?: ConGeometria
  members?: { type: string; role: string; geometry?: ConGeometria }[]
}

const igual = (a: Punto, b: Punto) => a.lat === b.lat && a.lng === b.lng
const aPuntos = (g: ConGeometria): Punto[] => g.map((p) => ({ lat: p.lat, lng: p.lon }))

/**
 * Anillos exteriores de un elemento de OSM devuelto con `out geom`:
 * - una vía cerrada es un anillo;
 * - una relación (multipolígono) puede tener varias parcelas, y cada parcela puede venir
 *   partida en varias vías abiertas que se unen por sus extremos.
 * Lanza un error si queda algún tramo que no cierra (el dato de OSM estaría roto).
 */
export function anillosDePoligono(el: ElementoPoligono): Punto[][] {
  const tramos =
    el.type === 'way'
      ? [aPuntos(el.geometry ?? [])]
      : (el.members ?? [])
          .filter((m) => m.type === 'way' && m.role === 'outer' && m.geometry?.length)
          .map((m) => aPuntos(m.geometry!))
  if (tramos.length === 0 || tramos.some((t) => t.length < 2))
    throw new Error(`${el.type}/${el.id} no trae geometría (¿falta "out geom"?)`)

  const anillos: Punto[][] = []
  const pendientes = [...tramos]
  while (pendientes.length) {
    let actual = pendientes.shift()!
    while (!igual(actual[0], actual[actual.length - 1])) {
      const fin = actual[actual.length - 1]
      const i = pendientes.findIndex(
        (t) => igual(t[0], fin) || igual(t[t.length - 1], fin),
      )
      if (i === -1)
        throw new Error(`${el.type}/${el.id}: un tramo del polígono no cierra`)
      const [siguiente] = pendientes.splice(i, 1)
      const orientado = igual(siguiente[0], fin) ? siguiente : [...siguiente].reverse()
      actual = [...actual, ...orientado.slice(1)]
    }
    if (actual.length < 4)
      throw new Error(`${el.type}/${el.id}: un anillo tiene muy pocos puntos`)
    anillos.push(actual)
  }
  return anillos
}

/** Geometría GeoJSON de los anillos: Polygon si hay uno, MultiPolygon si hay varios. */
export function geometriaGeoJSON(anillos: Punto[][]) {
  const coords = anillos.map((a) => a.map((p) => [p.lng, p.lat]))
  return anillos.length === 1
    ? { type: 'Polygon' as const, coordinates: coords }
    : { type: 'MultiPolygon' as const, coordinates: coords.map((c) => [c]) }
}
