/** Id de lugar pedido en la URL (`?lugar=id`), o null. */
export function leerLugarDeUrl(busqueda: string): string | null {
  const id = new URLSearchParams(busqueda).get('lugar')?.trim()
  return id ? id : null
}

/** URL compartible de un lugar. Solo lleva el id público del lugar. */
export function enlaceDeLugar(
  id: string,
  base: { origin: string; pathname: string },
): string {
  return `${base.origin}${base.pathname}?${new URLSearchParams({ lugar: id })}`
}

/** Nueva `search` para la URL actual: pone o quita `lugar` sin tocar otros parámetros. */
export function busquedaConLugar(busquedaActual: string, id: string | null): string {
  const p = new URLSearchParams(busquedaActual)
  if (id) p.set('lugar', id)
  else p.delete('lugar')
  const s = p.toString()
  return s ? `?${s}` : ''
}
