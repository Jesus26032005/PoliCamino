import { describe, expect, it } from 'vitest'
import {
  aplicarServicios,
  enlaceSugerencia,
  filtrarPorServicios,
  validarAportes,
} from './servicios'
import type { Atributo, Lugar } from './tipos'

const lugar = (id: string, extra: Partial<Lugar> = {}): Lugar => ({
  id,
  campusId: 'zacatenco',
  nombre: `Lugar ${id}`,
  categoria: 'biblioteca',
  coordenadas: [19.5, -99.14],
  verificado: false,
  ...extra,
})
const attr = <V>(valor: V, extra: Partial<Atributo<V>> = {}): Atributo<V> => ({
  valor,
  fuente: 'Visita en campo',
  fecha: '2026-11-13',
  verificado: false,
  ...extra,
})
const ids = new Set(['a', 'b'])

describe('validarAportes', () => {
  it('acepta {} y aportes completos', () => {
    expect(validarAportes({}, ids)).toEqual([])
    expect(
      validarAportes(
        { a: { enchufes: attr('muchos'), silencio: attr('silencioso') } },
        ids,
      ),
    ).toEqual([])
  })
  it('rechaza lugares inexistentes, valores raros, sin fuente o con fecha mala', () => {
    expect(validarAportes({ zzz: { enchufes: attr('muchos') } }, ids)[0]).toMatch(
      /no existe/,
    )
    expect(validarAportes({ a: { enchufes: attr('cientos' as never) } }, ids)[0]).toMatch(
      /valor inválido/,
    )
    expect(
      validarAportes({ a: { enchufes: attr('muchos', { fuente: ' ' }) } }, ids)[0],
    ).toMatch(/fuente/)
    expect(
      validarAportes(
        { a: { enchufes: attr('muchos', { fecha: '13/11/2026' }) } },
        ids,
      )[0],
    ).toMatch(/fecha/)
    expect(validarAportes({ a: {} }, ids)[0]).toMatch(/ni silencio/)
    expect(validarAportes([], ids)[0]).toMatch(/objeto/)
  })
})

describe('aplicarServicios', () => {
  it('une los aportes al lugar correcto y no toca los demás', () => {
    const r = aplicarServicios([lugar('a'), lugar('b')], {
      a: { enchufes: attr('pocos') },
    })
    expect(r[0].servicios?.enchufes?.valor).toBe('pocos')
    expect(r[1].servicios).toBeUndefined()
  })
  it('lanza un error claro si el archivo está mal', () => {
    expect(() =>
      aplicarServicios([lugar('a')], { x: { enchufes: attr('muchos') } }),
    ).toThrow(/Datos de servicios inválidos/)
  })
})

describe('filtrarPorServicios', () => {
  const ls = [
    lugar('a', { servicios: { enchufes: attr('muchos'), silencio: attr('silencioso') } }),
    lugar('b', { servicios: { enchufes: attr('no') } }),
    lugar('c'),
  ]
  it('sin filtros devuelve todo', () => {
    expect(filtrarPorServicios(ls, { enchufes: false, silencio: false })).toHaveLength(3)
  })
  it('enchufes = muchos o pocos; "no" y "sin dato" no cuentan', () => {
    expect(
      filtrarPorServicios(ls, { enchufes: true, silencio: false }).map((l) => l.id),
    ).toEqual(['a'])
  })
  it('combina enchufes y silencio con AND', () => {
    expect(
      filtrarPorServicios(ls, { enchufes: true, silencio: true }).map((l) => l.id),
    ).toEqual(['a'])
    expect(
      filtrarPorServicios(ls, { enchufes: false, silencio: true }).map((l) => l.id),
    ).toEqual(['a'])
  })
})

describe('enlaceSugerencia', () => {
  it('sin repositorio no inventa enlace', () => {
    expect(enlaceSugerencia(lugar('a'), '')).toBeNull()
    expect(enlaceSugerencia(lugar('a'), '   ')).toBeNull()
  })
  it('arma un issue prellenado con el lugar y su id', () => {
    const u = new URL(enlaceSugerencia(lugar('a'), 'https://github.com/x/y/')!)
    expect(u.origin + u.pathname).toBe('https://github.com/x/y/issues/new')
    expect(u.searchParams.get('title')).toContain('Lugar a')
    expect(u.searchParams.get('body')).toContain('Id: a')
  })
})
