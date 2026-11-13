import { describe, expect, it } from 'vitest'
import {
  dentroDelAnillo,
  distanciaAlAnillo,
  distanciaAlBorde,
  distanciaMetros,
} from './geometria.ts'

// Cuadrado de ~1.1 km de lado cerca de Zacatenco.
const anillo = [
  { lat: 19.5, lng: -99.15 },
  { lat: 19.5, lng: -99.14 },
  { lat: 19.51, lng: -99.14 },
  { lat: 19.51, lng: -99.15 },
  { lat: 19.5, lng: -99.15 },
]

describe('geometria', () => {
  it('mide distancias en metros', () => {
    expect(
      distanciaMetros({ lat: 19.5, lng: -99.14 }, { lat: 19.51, lng: -99.14 }),
    ).toBeCloseTo(1113, -1)
  })
  it('detecta puntos dentro y fuera', () => {
    expect(dentroDelAnillo({ lat: 19.505, lng: -99.145 }, anillo)).toBe(true)
    expect(dentroDelAnillo({ lat: 19.52, lng: -99.145 }, anillo)).toBe(false)
  })
  it('distancia al anillo: 0 dentro, metros fuera', () => {
    expect(distanciaAlAnillo({ lat: 19.505, lng: -99.145 }, anillo)).toBe(0)
    expect(distanciaAlAnillo({ lat: 19.511, lng: -99.145 }, anillo)).toBeCloseTo(111, -1)
  })
  it('distancia al borde desde dentro', () => {
    expect(distanciaAlBorde({ lat: 19.5001, lng: -99.145 }, anillo)).toBeCloseTo(11, 0)
  })
})
