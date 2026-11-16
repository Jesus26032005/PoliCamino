import { describe, expect, it } from 'vitest'
import datos from '../data/zacatenco.lugares.json'
import {
  buscar,
  crearIndice,
  filtrarPorCategorias,
  normalizar,
  ocultarCategorias,
} from './busqueda'
import { validarLugares } from './lugares'

const lugares = validarLugares(datos)
const indice = crearIndice(lugares)

describe('normalizar', () => {
  it('quita acentos, mayúsculas y signos', () => {
    expect(normalizar('  Cafetería  #2 ')).toBe('cafeteria 2')
    expect(normalizar('Baños')).toBe('banos')
  })
})

describe('buscar (con los datos reales)', () => {
  it('encuentra ESCOM por sigla, sin importar mayúsculas', () => {
    for (const q of ['escom', 'ESCOM', 'Escom']) {
      expect(buscar(indice, q)[0].nombre).toBe('Escuela Superior de Cómputo')
    }
  })
  it('"biblio" devuelve las bibliotecas primero', () => {
    const r = buscar(indice, 'biblio')
    const bibliotecas = lugares.filter((l) => l.categoria === 'biblioteca')
    expect(bibliotecas.length).toBeGreaterThan(0)
    expect(
      r.slice(0, bibliotecas.length).every((l) => l.categoria === 'biblioteca'),
    ).toBe(true)
  })
  it('"cafeteria" y "cafetería" dan lo mismo; las cafeterías van primero', () => {
    const a = buscar(indice, 'cafeteria', 50)
    expect(a).toEqual(buscar(indice, 'cafetería', 50))
    const cafeterias = lugares.filter((l) => l.categoria === 'cafeteria')
    expect(cafeterias.length).toBeGreaterThan(5)
    // Todas aparecen, y antes que lo que solo menciona la palabra (ej. "Cancha Cafetería").
    expect(a.slice(0, cafeterias.length).every((l) => l.categoria === 'cafeteria')).toBe(
      true,
    )
  })
  it('combina palabras: "cafeteria 3"', () => {
    expect(buscar(indice, 'cafeteria 3')[0].nombre).toBe('Cafetería 3')
  })
  it('encuentra siglas de otras escuelas', () => {
    expect(buscar(indice, 'esime')[0].alias).toContain('ESIME')
    expect(buscar(indice, 'cic')[0].alias).toContain('CIC')
  })
  it('consulta vacía o sin coincidencias no devuelve nada', () => {
    expect(buscar(indice, '')).toEqual([])
    expect(buscar(indice, '   ')).toEqual([])
    expect(buscar(indice, 'zzzxqw')).toEqual([])
  })
  it('respeta el límite', () => {
    expect(buscar(indice, 'e', 3).length).toBeLessThanOrEqual(3)
  })
})

describe('filtrarPorCategorias', () => {
  it('sin categorías activas devuelve todo', () => {
    expect(filtrarPorCategorias(lugares, new Set())).toHaveLength(lugares.length)
  })
  it('filtra por varias categorías', () => {
    const r = filtrarPorCategorias(lugares, new Set(['biblioteca', 'cafeteria'] as const))
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((l) => ['biblioteca', 'cafeteria'].includes(l.categoria))).toBe(true)
  })
})

describe('ocultarCategorias', () => {
  it('sin categorías apagadas devuelve todo', () => {
    expect(ocultarCategorias(lugares, new Set())).toHaveLength(lugares.length)
  })
  it('quita solo las categorías apagadas', () => {
    const r = ocultarCategorias(lugares, new Set(['transporte', 'acceso'] as const))
    expect(r.length).toBeGreaterThan(0)
    expect(r.length).toBeLessThan(lugares.length)
    expect(r.some((l) => l.categoria === 'transporte' || l.categoria === 'acceso')).toBe(
      false,
    )
  })
  it('con todas apagadas no queda nada', () => {
    const todas = new Set(lugares.map((l) => l.categoria))
    expect(ocultarCategorias(lugares, todas)).toEqual([])
  })
})
