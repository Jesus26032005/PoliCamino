import { describe, expect, it } from 'vitest'
import {
  admiteOcupacion,
  agregarOcupacion,
  leerRespuestaOcupacion,
  medianaNivel,
  validarReporte,
  VENTANA_MS,
  type ReporteBasico,
} from './ocupacion'

const AHORA = 1_800_000_000_000
const r = (
  lugarId: string,
  nivel: 1 | 2 | 3 | 4,
  haceMin: number,
  dispositivo: string,
): ReporteBasico => ({
  lugarId,
  nivel,
  creado: AHORA - haceMin * 60_000,
  dispositivo,
})

describe('medianaNivel', () => {
  it('mediana de impares y pares (redondea hacia arriba)', () => {
    expect(medianaNivel([1, 3, 4])).toBe(3)
    expect(medianaNivel([2, 2, 4])).toBe(2)
    expect(medianaNivel([1, 2, 3, 4])).toBe(3) // 2.5 -> 3
    expect(medianaNivel([4])).toBe(4)
  })
  it('un valor extremo no mueve el resultado (resistente a bromas)', () => {
    expect(medianaNivel([2, 2, 2, 2, 4])).toBe(2)
  })
})

describe('agregarOcupacion', () => {
  it('agrupa por lugar y calcula nivel, cantidad y último reporte', () => {
    const a = agregarOcupacion(
      [
        r('cafe-1', 3, 5, 'disp-aaaaaaaaaaaaaaaa'),
        r('cafe-1', 4, 2, 'disp-bbbbbbbbbbbbbbbb'),
        r('cafe-1', 3, 1, 'disp-cccccccccccccccc'),
      ],
      AHORA,
    )
    expect(a['cafe-1']).toEqual({ nivel: 3, reportes: 3, ultimo: AHORA - 60_000 })
  })
  it('exige un mínimo de reportes', () => {
    expect(
      agregarOcupacion(
        [r('x', 2, 1, 'a'.repeat(16)), r('x', 2, 2, 'b'.repeat(16))],
        AHORA,
      ),
    ).toEqual({})
  })
  it('exige varios dispositivos: una persona no fija el dato sola', () => {
    const mismo = 'z'.repeat(16)
    expect(
      agregarOcupacion(
        [r('x', 4, 1, mismo), r('x', 4, 2, mismo), r('x', 4, 3, mismo)],
        AHORA,
      ),
    ).toEqual({})
  })
  it('ignora reportes caducados y del futuro', () => {
    const viejos = [
      r('x', 4, 46, 'a'.repeat(16)),
      r('x', 4, 50, 'b'.repeat(16)),
      r('x', 4, 60, 'c'.repeat(16)),
    ]
    expect(agregarOcupacion(viejos, AHORA)).toEqual({})
    const futuro: ReporteBasico = {
      ...r('x', 4, 0, 'd'.repeat(16)),
      creado: AHORA + 5 * 60_000,
    }
    expect(
      agregarOcupacion(
        [futuro, r('x', 2, 1, 'a'.repeat(16)), r('x', 2, 2, 'b'.repeat(16))],
        AHORA,
      ),
    ).toEqual({})
  })
  it('el límite de la ventana es exacto', () => {
    const justo: ReporteBasico[] = ['a', 'b', 'c'].map((c) => ({
      ...r('x', 2, 0, c.repeat(16)),
      creado: AHORA - VENTANA_MS,
    }))
    expect(agregarOcupacion(justo, AHORA).x).toBeDefined()
    expect(agregarOcupacion(justo, AHORA + 1)).toEqual({})
  })
})

describe('validarReporte', () => {
  const ok = {
    lugarId: 'osm-w123',
    nivel: 3,
    dispositivo: '123e4567-e89b-42d3-a456-426614174000',
  }
  it('acepta un reporte correcto', () => {
    expect(validarReporte(ok)).toEqual({ ok: true, ...ok })
  })
  it('rechaza lo mal formado', () => {
    for (const mal of [
      null,
      [],
      'x',
      { ...ok, nivel: 5 },
      { ...ok, nivel: '3' },
      { ...ok, lugarId: 'A B' },
      { ...ok, lugarId: '' },
      { ...ok, dispositivo: 'corto' },
      { ...ok, lugarId: 'x'.repeat(65) },
    ]) {
      expect(validarReporte(mal).ok).toBe(false)
    }
  })
})

describe('leerRespuestaOcupacion y categorías', () => {
  it('lee la respuesta y descarta entradas inválidas', () => {
    const resp = leerRespuestaOcupacion({
      generado: 1,
      ventanaMin: 45,
      lugares: { a: { nivel: 2, reportes: 3, ultimo: 5 }, b: { nivel: 9 } },
    })
    expect(Object.keys(resp.lugares)).toEqual(['a'])
  })
  it('lanza con formatos incorrectos', () => {
    expect(() => leerRespuestaOcupacion(null)).toThrow()
    expect(() => leerRespuestaOcupacion({ generado: 1 })).toThrow()
  })
  it('solo cafeterías y bibliotecas participan', () => {
    expect(admiteOcupacion('cafeteria')).toBe(true)
    expect(admiteOcupacion('biblioteca')).toBe(true)
    expect(admiteOcupacion('escuela')).toBe(false)
  })
})
