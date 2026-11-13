import { INFO_CATEGORIA } from './categorias'
import type { Categoria, Lugar } from './tipos'

/** Minúsculas, sin acentos ni signos: "Cafetería #2" -> "cafeteria 2". */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

type Entrada = {
  lugar: Lugar
  nombre: string
  palabras: string[]
  alias: string[]
  categoria: string
}

export type IndiceBusqueda = Entrada[]

export function crearIndice(lugares: Lugar[]): IndiceBusqueda {
  return lugares.map((lugar) => {
    const nombre = normalizar(lugar.nombre)
    return {
      lugar,
      nombre,
      palabras: nombre.split(' '),
      alias: (lugar.alias ?? []).map(normalizar),
      categoria: normalizar(INFO_CATEGORIA[lugar.categoria].etiqueta),
    }
  })
}

/** Puntaje de un token contra una entrada; 0 = no coincide. */
function puntuar(token: string, e: Entrada): number {
  let mejor = 0
  for (const a of e.alias) {
    if (a === token) mejor = Math.max(mejor, 100)
    else if (a.startsWith(token)) mejor = Math.max(mejor, 80)
  }
  const i = e.palabras.findIndex((p) => p.startsWith(token))
  if (i >= 0) mejor = Math.max(mejor, i === 0 ? 70 : 60)
  else if (e.nombre.includes(token)) mejor = Math.max(mejor, 30)
  if (e.categoria.startsWith(token)) mejor = Math.max(mejor, 65)
  return mejor
}

/**
 * Busca por nombre, siglas/alias y categoría. Cada palabra de la consulta
 * debe coincidir con algo; el resultado se ordena por relevancia.
 */
export function buscar(indice: IndiceBusqueda, consulta: string, limite = 8): Lugar[] {
  const tokens = normalizar(consulta).split(' ').filter(Boolean)
  if (!tokens.length) return []
  const resultados: { lugar: Lugar; puntos: number; nombre: string }[] = []
  for (const e of indice) {
    let total = 0
    for (const t of tokens) {
      const p = puntuar(t, e)
      if (!p) {
        total = 0
        break
      }
      total += p
    }
    if (total) resultados.push({ lugar: e.lugar, puntos: total, nombre: e.nombre })
  }
  resultados.sort(
    (a, b) =>
      b.puntos - a.puntos ||
      a.nombre.length - b.nombre.length ||
      a.nombre.localeCompare(b.nombre, 'es'),
  )
  return resultados.slice(0, limite).map((r) => r.lugar)
}

/** Aplica el filtro de categorías (vacío = todas). */
export function filtrarPorCategorias(
  lugares: Lugar[],
  activas: ReadonlySet<Categoria>,
): Lugar[] {
  return activas.size === 0 ? lugares : lugares.filter((l) => activas.has(l.categoria))
}
