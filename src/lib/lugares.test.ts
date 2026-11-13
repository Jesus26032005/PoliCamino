import { describe, expect, it } from 'vitest'
import { CAMPUS } from '../data/campus'
import datos from '../data/zacatenco.lugares.json'
import { dentroDeLimites } from './geo'
import { cargarLugares, lugaresAGeoJSON, validarLugar, validarLugares } from './lugares'
import type { Lugar } from './tipos'

const base: Lugar = {
  id: 'x',
  campusId: 'zacatenco',
  nombre: 'Prueba',
  categoria: 'escuela',
  coordenadas: [19.5, -99.14],
  verificado: false,
}

describe('validarLugar', () => {
  it('acepta un lugar correcto', () => {
    expect(validarLugar(base)).toEqual([])
  })
  it('rechaza categoría y coordenadas inválidas', () => {
    expect(validarLugar({ ...base, categoria: 'volcan' })).not.toEqual([])
    expect(validarLugar({ ...base, coordenadas: [999, 0] })).not.toEqual([])
    expect(validarLugar({ ...base, coordenadas: [1] })).not.toEqual([])
  })
  it('exige fuente para verificado u horario', () => {
    expect(validarLugar({ ...base, verificado: true })).not.toEqual([])
    expect(validarLugar({ ...base, horario: '8-14' })).not.toEqual([])
    expect(
      validarLugar({ ...base, verificado: true, fuente: 'Visita en campo' }),
    ).toEqual([])
  })
  it('validarLugares detecta ids repetidos', () => {
    expect(() => validarLugares([base, base])).toThrow(/repetido/)
  })
})

describe('lugaresAGeoJSON', () => {
  it('invierte a [lng, lat]', () => {
    const g = lugaresAGeoJSON([base])
    expect(g.features[0].geometry.coordinates).toEqual([-99.14, 19.5])
  })
})

describe('datos de Zacatenco', () => {
  it('cargan y son válidos', async () => {
    const lugares = await cargarLugares('zacatenco')
    expect(lugares.length).toBeGreaterThan(30)
  })
  it('están dentro de los límites del campus (con holgura para el transporte cercano)', () => {
    for (const l of datos) {
      expect(
        dentroDeLimites(
          l.coordenadas[0],
          l.coordenadas[1],
          CAMPUS.zacatenco.limites,
          0.01,
        ),
      ).toBe(true)
    }
  })
  it('hay accesos, Metro y paradas, todos con fuente y sin verificar', () => {
    const cats = (c: string) => datos.filter((l) => l.categoria === c)
    expect(cats('acceso').length).toBeGreaterThan(0)
    expect(cats('transporte').some((l) => l.nombre.startsWith('Metro '))).toBe(true)
    expect(cats('transporte').some((l) => l.nombre.startsWith('Parada '))).toBe(true)
    for (const l of [...cats('acceso'), ...cats('transporte')]) {
      expect(l.fuente).toMatch(/OpenStreetMap/)
      expect(l.verificado).toBe(false)
    }
  })
  it('incluye ESCOM', () => {
    const escom = datos.find((l) => l.alias?.includes('ESCOM'))
    expect(escom?.nombre).toBe('Escuela Superior de Cómputo')
  })
  it('nada importado de OSM está marcado como verificado', () => {
    expect(datos.filter((l) => l.verificado)).toEqual([])
  })
  it('ninguno trae horario sin fuente', () => {
    expect(datos.filter((l) => 'horario' in l)).toEqual([])
  })
})
