import type { LatLng } from './tipos'

/** ¿El punto cae dentro de la caja [suroeste, noreste], con holgura opcional en grados? */
export function dentroDeLimites(
  lat: number,
  lng: number,
  limites: [LatLng, LatLng],
  holgura = 0,
): boolean {
  const [[s, o], [n, e]] = limites
  return (
    lat >= s - holgura && lat <= n + holgura && lng >= o - holgura && lng <= e + holgura
  )
}

type Geometria =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] }

/** Caja [oeste, sur, este, norte] de un Polygon o MultiPolygon de GeoJSON. */
export function cajaDeGeometria(g: Geometria): [number, number, number, number] {
  const puntos = g.type === 'Polygon' ? g.coordinates.flat() : g.coordinates.flat(2)
  const lngs = puntos.map((p) => p[0])
  const lats = puntos.map((p) => p[1])
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)]
}
