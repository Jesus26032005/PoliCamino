/** Id de lugar pedido en la URL (`?lugar=id`), o null. */
export function leerLugarDeUrl(busqueda: string): string | null {
  const id = new URLSearchParams(busqueda).get('lugar')?.trim()
  return id ? id : null
}

/** Campus pedido en la URL (`?campus=id`), o null. Quien lo usa valida que exista. */
export function leerCampusDeUrl(busqueda: string): string | null {
  const id = new URLSearchParams(busqueda).get('campus')?.trim()
  return id ? id : null
}

/** URL compartible de un lugar. Solo lleva ids públicos (campus y lugar). */
export function enlaceDeLugar(
  id: string,
  base: { origin: string; pathname: string },
  campus?: string,
): string {
  const p = new URLSearchParams()
  if (campus) p.set('campus', campus)
  p.set('lugar', id)
  return `${base.origin}${base.pathname}?${p}`
}

/**
 * Nueva `search` para la URL actual: pone o quita `lugar` y `campus` sin tocar otros
 * parámetros. `undefined` = no cambiar; `null` = quitar.
 */
export function busquedaCon(
  busquedaActual: string,
  cambios: { lugar?: string | null; campus?: string | null },
): string {
  const p = new URLSearchParams(busquedaActual)
  for (const [clave, valor] of Object.entries(cambios)) {
    if (valor === undefined) continue
    if (valor) p.set(clave, valor)
    else p.delete(clave)
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}
