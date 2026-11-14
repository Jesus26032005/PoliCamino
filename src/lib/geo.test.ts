import { describe, expect, it } from 'vitest'
import { CAMPUS } from '../data/campus'
import { dentroDeLimites } from './geo'

describe('dentroDeLimites', () => {
  const { limites } = CAMPUS.zacatenco
  it('reconoce un punto dentro del campus', () => {
    expect(dentroDeLimites(19.5019, -99.1402, limites)).toBe(true)
  })
  it('reconoce un punto lejano (Zócalo) como fuera', () => {
    expect(dentroDeLimites(19.4326, -99.1332, limites)).toBe(false)
  })
  it('la holgura amplía la caja', () => {
    expect(dentroDeLimites(19.514, -99.1402, limites)).toBe(false)
    expect(dentroDeLimites(19.514, -99.1402, limites, 0.01)).toBe(true)
  })
})

describe('cajaDeGeometria', () => {
  it('Polygon y MultiPolygon (varias parcelas)', async () => {
    const { cajaDeGeometria } = await import('./geo')
    const a = [
      [-99.2, 19.4],
      [-99.1, 19.4],
      [-99.1, 19.5],
      [-99.2, 19.4],
    ]
    expect(cajaDeGeometria({ type: 'Polygon', coordinates: [a] })).toEqual([
      -99.2, 19.4, -99.1, 19.5,
    ])
    const b = [
      [-98.0, 20.0],
      [-97.9, 20.0],
      [-97.9, 20.1],
      [-98.0, 20.0],
    ]
    expect(cajaDeGeometria({ type: 'MultiPolygon', coordinates: [[a], [b]] })).toEqual([
      -99.2, 19.4, -97.9, 20.1,
    ])
  })
})
