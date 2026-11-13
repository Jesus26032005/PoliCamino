import { describe, expect, it } from 'vitest'
import {
  construirAccesosYTransporte,
  textoDistancia,
  type ElementoOSM,
} from './transporte.ts'

// Cuadrado de ~1.1 km: lat 19.50–19.51, lng -99.15 – -99.14.
const anillo = [
  { lat: 19.5, lng: -99.15 },
  { lat: 19.5, lng: -99.14 },
  { lat: 19.51, lng: -99.14 },
  { lat: 19.51, lng: -99.15 },
  { lat: 19.5, lng: -99.15 },
]
const nodo = (
  id: number,
  lat: number,
  lon: number,
  tags: Record<string, string>,
): ElementoOSM => ({
  type: 'node',
  id,
  lat,
  lon,
  tags,
})

describe('textoDistancia', () => {
  it('distingue dentro, junto al límite y a distancia', () => {
    expect(textoDistancia(0)).toBe('Dentro del campus.')
    expect(textoDistancia(4)).toBe('Junto al límite del campus.')
    expect(textoDistancia(312)).toBe('A unos 310 m del campus en línea recta.')
  })
})

describe('construirAccesosYTransporte', () => {
  it('incluye metro cercano, excluye el lejano y fusiona duplicados', () => {
    const r = construirAccesosYTransporte(
      [],
      [
        nodo(1, 19.505, -99.152, {
          name: 'Politécnico',
          railway: 'station',
          station: 'subway',
        }),
        nodo(2, 19.505, -99.152, {
          name: 'Politécnico L5',
          railway: 'station',
          station: 'subway',
        }),
        nodo(3, 19.54, -99.1, { name: 'Lejana', railway: 'station', station: 'subway' }),
      ],
      anillo,
      '2026-01-01',
    )
    expect(r.map((l) => l.nombre)).toEqual(['Metro Politécnico'])
    expect(r[0].verificado).toBe(false)
    expect(r[0].fuente).toContain('node/1')
  })
  it('paradas: ignora las sin nombre y las lejanas; une pares en el mismo punto', () => {
    const r = construirAccesosYTransporte(
      [],
      [
        nodo(1, 19.505, -99.1395, {
          name: 'ESCOM',
          highway: 'bus_stop',
          operator: 'Trolebús',
        }),
        nodo(2, 19.505, -99.13951, { name: 'ESCOM', highway: 'bus_stop' }),
        nodo(3, 19.505, -99.1395, { highway: 'bus_stop' }),
        nodo(4, 19.52, -99.12, { name: 'Lejos', highway: 'bus_stop' }),
      ],
      anillo,
      '2026-01-01',
    )
    expect(r).toHaveLength(1)
    expect(r[0].nombre).toBe('Parada ESCOM')
    expect(r[0].descripcion).toContain('trolebús')
  })
  it('accesos: solo puertas junto al borde y no privadas; fusiona puerta + pluma', () => {
    const r = construirAccesosYTransporte(
      [
        nodo(10, 19.505, -99.1399, { barrier: 'gate' }),
        nodo(11, 19.50501, -99.1399, { barrier: 'lift_gate' }),
        nodo(12, 19.505, -99.145, { barrier: 'gate' }), // interior del campus
        nodo(13, 19.506, -99.1399, { barrier: 'gate', access: 'private' }),
      ],
      [nodo(20, 19.5051, -99.1399, { name: 'Bátiz', highway: 'bus_stop' })],
      anillo,
      '2026-01-01',
    )
    const accesos = r.filter((l) => l.categoria === 'acceso')
    expect(accesos).toHaveLength(1)
    expect(accesos[0].nombre).toBe('Acceso cerca de «Bátiz»')
    expect(accesos[0].verificado).toBe(false)
  })
})
