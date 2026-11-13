import { describe, expect, it } from 'vitest'
import { CAMPUS } from '../data/campus'
import datos from '../data/zacatenco.lugares.json'
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
  it('están dentro de los límites del campus', () => {
    const [[s, o], [n, e]] = CAMPUS.zacatenco.limites
    for (const l of datos) {
      expect(l.coordenadas[0]).toBeGreaterThan(s)
      expect(l.coordenadas[0]).toBeLessThan(n)
      expect(l.coordenadas[1]).toBeGreaterThan(o)
      expect(l.coordenadas[1]).toBeLessThan(e)
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
