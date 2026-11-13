import { describe, expect, it } from 'vitest'
import { aliasPara, clasificar } from './clasificar.ts'

describe('clasificar', () => {
  it('descarta elementos sin nombre, calles y paradas', () => {
    expect(clasificar({ amenity: 'cafe' })).toBeNull()
    expect(clasificar({ name: 'Avenida X', highway: 'secondary' })).toBeNull()
    expect(clasificar({ name: 'ESCOM', highway: 'bus_stop' })).toBeNull()
  })
  it('descarta el polígono del propio campus', () => {
    expect(
      clasificar({
        name: 'Instituto Politécnico Nacional Unidad Profesional Adolfo López Mateos',
        amenity: 'university',
      }),
    ).toBeNull()
  })
  it('clasifica por etiquetas y por nombre', () => {
    expect(clasificar({ name: 'Escuela Superior de Cómputo', amenity: 'school' })).toBe(
      'escuela',
    )
    expect(clasificar({ name: 'Biblioteca ESFM', amenity: 'library' })).toBe('biblioteca')
    expect(clasificar({ name: 'Cafetería 2', amenity: 'cafe' })).toBe('cafeteria')
    expect(clasificar({ name: 'Cancha Cafetería', leisure: 'pitch' })).toBe('deporte')
    expect(clasificar({ name: 'Servicios Médicos', amenity: 'doctors' })).toBe('servicio')
    expect(clasificar({ name: 'Laboratorios', building: 'school' })).toBe('laboratorio')
  })
})

describe('aliasPara', () => {
  it('reconoce ESCOM', () => {
    expect(aliasPara('Escuela Superior de Cómputo')).toEqual(['ESCOM'])
  })
  it('no inventa siglas', () => {
    expect(aliasPara('Cafetería 2')).toBeUndefined()
  })
})
