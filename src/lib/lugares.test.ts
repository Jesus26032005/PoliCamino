import { describe, expect, it } from 'vitest'
import { CAMPUS_LISTA } from '../data/campus'
import { cajaDeGeometria, dentroDeLimites } from './geo'
import {
  cargarLimite,
  cargarLugares,
  lugaresAGeoJSON,
  validarLugar,
  validarLugares,
} from './lugares'
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

describe.each(CAMPUS_LISTA)('datos de $nombre', (campus) => {
  it('cargan, son válidos y todos pertenecen al campus', async () => {
    const lugares = await cargarLugares(campus.id)
    expect(lugares.length).toBeGreaterThan(30)
    expect(lugares.every((l) => l.campusId === campus.id)).toBe(true)
  })
  it('están dentro de los límites del campus (con holgura para el transporte cercano)', async () => {
    for (const l of await cargarLugares(campus.id)) {
      expect(
        dentroDeLimites(l.coordenadas[0], l.coordenadas[1], campus.limites, 0.01),
      ).toBe(true)
    }
  })
  it('el polígono carga y cabe dentro de los límites declarados', async () => {
    const [oeste, sur, este, norte] = cajaDeGeometria(
      (await cargarLimite(campus.id)).geometry,
    )
    const [[s, o], [n, e]] = campus.limites
    expect(sur).toBeGreaterThan(s)
    expect(norte).toBeLessThan(n)
    expect(oeste).toBeGreaterThan(o)
    expect(este).toBeLessThan(e)
  })
  it('hay accesos y Metro, todos con fuente y sin verificar', async () => {
    const datos = await cargarLugares(campus.id)
    const cats = (c: string) => datos.filter((l) => l.categoria === c)
    expect(cats('acceso').length).toBeGreaterThan(0)
    expect(cats('transporte').some((l) => l.nombre.startsWith('Metro '))).toBe(true)
    for (const l of [...cats('acceso'), ...cats('transporte')]) {
      expect(l.fuente).toMatch(/OpenStreetMap/)
      expect(l.verificado).toBe(false)
    }
  })
  it('nada importado de OSM está marcado como verificado ni trae horario sin fuente', async () => {
    const datos = await cargarLugares(campus.id)
    expect(datos.filter((l) => l.verificado)).toEqual([])
    expect(datos.filter((l) => l.horario !== undefined)).toEqual([])
  })
})

describe('siglas clave por campus', () => {
  it('Zacatenco incluye ESCOM', async () => {
    const escom = (await cargarLugares('zacatenco')).find((l) =>
      l.alias?.includes('ESCOM'),
    )
    expect(escom?.nombre).toBe('Escuela Superior de Cómputo')
  })
  it('Santo Tomás incluye ENCB, ESM, ESE y ESCA', async () => {
    const ls = await cargarLugares('santo-tomas')
    for (const sigla of ['ENCB', 'ESM', 'ESE', 'ESCA']) {
      expect(
        ls.some((l) => l.alias?.includes(sigla)),
        sigla,
      ).toBe(true)
    }
  })
  it('un id de un campus no aparece en el otro', async () => {
    const a = new Set((await cargarLugares('zacatenco')).map((l) => l.id))
    for (const l of await cargarLugares('santo-tomas')) expect(a.has(l.id)).toBe(false)
  })
})
