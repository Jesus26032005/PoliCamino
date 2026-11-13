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
