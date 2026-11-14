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

describe('clasificar (Santo Tomás)', () => {
  it('CECyT y centros culturales ya no caen en "otro"', () => {
    expect(
      clasificar({
        name: 'Centro de Estudios Científicos y Tecnológicos N° 11 "Wilfrido Massieu" IPN',
        building: 'university',
      }),
    ).toBe('escuela')
    expect(
      clasificar({
        name: 'Centro Histórico y Cultural "Juan de Dios Bátiz" IPN',
        amenity: 'events_venue',
      }),
    ).toBe('cultura')
  })
})

describe('aliasPara (más siglas)', () => {
  it('reconoce las escuelas del Casco de Santo Tomás', () => {
    expect(aliasPara('Escuela Superior de Medicina')).toEqual(['ESM'])
    expect(aliasPara('Escuela Superior de Economía')).toEqual(['ESE'])
    expect(aliasPara('Escuela Superior de Comercio y Administración')).toEqual(['ESCA'])
    expect(aliasPara('Escuela Superior de Enfermería y Obstretricia')).toEqual(['ESEO'])
    expect(
      aliasPara(
        'Centro de Estudios Científicos y Tecnológicos N° 11 "Wilfrido Massieu" IPN',
      ),
    ).toEqual(['CECYT 11'])
    expect(aliasPara('Centro de Lenguas Extranjeras Unidad Santo Tomás')).toEqual([
      'CENLEX',
    ])
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
