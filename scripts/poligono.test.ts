import { describe, expect, it } from 'vitest'
import { dentroDelPoligono, distanciaAlPoligono } from './geometria.ts'
import { anillosDePoligono, geometriaGeoJSON } from './poligono.ts'

const g = (...pts: [number, number][]) => pts.map(([lat, lon]) => ({ lat, lon }))
const cuadro = g([0, 0], [0, 1], [1, 1], [1, 0], [0, 0])

describe('anillosDePoligono', () => {
  it('una vía cerrada es un anillo', () => {
    const r = anillosDePoligono({ type: 'way', id: 1, geometry: cuadro })
    expect(r).toHaveLength(1)
    expect(r[0]).toHaveLength(5)
  })
  it('una relación con varias parcelas cerradas da varios anillos', () => {
    const otro = g([5, 5], [5, 6], [6, 6], [5, 5])
    const r = anillosDePoligono({
      type: 'relation',
      id: 2,
      members: [
        { type: 'way', role: 'outer', geometry: cuadro },
        { type: 'way', role: 'outer', geometry: otro },
        {
          type: 'way',
          role: 'inner',
          geometry: g([0.4, 0.4], [0.4, 0.6], [0.6, 0.6], [0.4, 0.4]),
        },
      ],
    })
    expect(r).toHaveLength(2)
  })
  it('une tramos abiertos, incluso si vienen en sentido contrario', () => {
    const r = anillosDePoligono({
      type: 'relation',
      id: 3,
      members: [
        { type: 'way', role: 'outer', geometry: g([0, 0], [0, 1], [1, 1]) },
        { type: 'way', role: 'outer', geometry: g([0, 0], [1, 0], [1, 1]) }, // al revés
      ],
    })
    expect(r).toHaveLength(1)
    expect(r[0][0]).toEqual(r[0][r[0].length - 1])
  })
  it('falla con claridad si un tramo no cierra o falta la geometría', () => {
    expect(() =>
      anillosDePoligono({
        type: 'relation',
        id: 4,
        members: [{ type: 'way', role: 'outer', geometry: g([0, 0], [0, 1], [1, 1]) }],
      }),
    ).toThrow(/no cierra/)
    expect(() => anillosDePoligono({ type: 'way', id: 5 })).toThrow(/geometría/)
  })
})

describe('geometriaGeoJSON y multi-parcela', () => {
  it('Polygon con un anillo, MultiPolygon con varios, en [lng, lat]', () => {
    const a = anillosDePoligono({
      type: 'way',
      id: 1,
      geometry: g([0, 10], [0, 11], [1, 11], [0, 10]),
    })
    const uno = geometriaGeoJSON(a)
    expect(uno.type).toBe('Polygon')
    expect(uno.coordinates[0][0]).toEqual([10, 0])
    expect(geometriaGeoJSON([...a, ...a]).type).toBe('MultiPolygon')
  })
  it('dentro/distancia consideran todas las parcelas', () => {
    const pa = anillosDePoligono({ type: 'way', id: 1, geometry: cuadro })
    const pb = anillosDePoligono({
      type: 'way',
      id: 2,
      geometry: g([5, 5], [5, 6], [6, 6], [6, 5], [5, 5]),
    })
    const anillos = [...pa, ...pb]
    expect(dentroDelPoligono({ lat: 5.5, lng: 5.5 }, anillos)).toBe(true)
    expect(dentroDelPoligono({ lat: 3, lng: 3 }, anillos)).toBe(false)
    expect(distanciaAlPoligono({ lat: 5.5, lng: 5.5 }, anillos)).toBe(0)
    expect(distanciaAlPoligono({ lat: 1.0, lng: 3 }, anillos)).toBeGreaterThan(0)
  })
})
