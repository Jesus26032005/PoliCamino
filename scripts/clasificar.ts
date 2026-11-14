import type { Categoria } from '../src/lib/tipos.ts'

export type TagsOSM = Record<string, string>

const RE = {
  biblioteca: /^biblioteca/i,
  deporte: /gimnasio|cancha|alberca|\bcampo\b|estadio|dojo/i,
  cafeteria: /cafeter|barra de caf/i,
  cultura: /centro cultural|centro hist[oó]rico|auditorio|planetario|monumento|plaza/i,
  servicio:
    /servicios m[eé]dicos|farmacia|librer[ií]a|ventanilla|administraci[oó]n escolar|^(direcci[oó]n|secretar[ií]a|coordinaci[oó]n|divisi[oó]n)/i,
  laboratorio: /laborator|estaci[oó]n meteorol/i,
  escuela:
    /^(escuela|edificio|edif\.|centro de (investigaci|innovaci|lenguas|estudios cient))/i,
  campusMismo: /^Instituto Polit[eé]cnico Nacional Unidad/i,
}

/**
 * Decide la categoría de un elemento de OSM, o `null` si no debe entrar
 * como lugar (calles, paradas, agua, el polígono del campus, etc.).
 */
export function clasificar(t: TagsOSM): Categoria | null {
  const nombre = t.name
  if (!nombre) return null
  if (t.highway || t.public_transport || t.route || t.place) return null
  if (t.natural === 'water' || t.building === 'stable') return null
  if (RE.campusMismo.test(nombre)) return null

  if (t.amenity === 'library' || RE.biblioteca.test(nombre)) return 'biblioteca'
  if (
    [
      'pitch',
      'stadium',
      'swimming_pool',
      'sports_centre',
      'fitness_centre',
      'track',
    ].includes(t.leisure) ||
    t.amenity === 'dojo' ||
    RE.deporte.test(nombre)
  )
    return 'deporte'
  if (
    ['cafe', 'restaurant', 'fast_food', 'food_court'].includes(t.amenity) ||
    RE.cafeteria.test(nombre)
  )
    return 'cafeteria'
  if (t.amenity === 'toilets') return 'baños'
  if (
    [
      'theatre',
      'planetarium',
      'arts_centre',
      'conference_centre',
      'cinema',
      'events_venue',
    ].includes(t.amenity) ||
    t.historic ||
    RE.cultura.test(nombre)
  )
    return 'cultura'
  if (
    ['doctors', 'clinic', 'pharmacy', 'atm', 'bank', 'post_office'].includes(t.amenity) ||
    t.shop ||
    t.office === 'government' ||
    RE.servicio.test(nombre)
  )
    return 'servicio'
  if (
    t.leisure === 'hackerspace' ||
    t.man_made === 'monitoring_station' ||
    RE.laboratorio.test(nombre)
  )
    return 'laboratorio'
  if (RE.escuela.test(nombre) || ['school', 'university', 'college'].includes(t.amenity))
    return 'escuela'

  // Algo con nombre y una etiqueta de lugar real, pero sin categoría clara.
  if (t.building || t.leisure || t.amenity) return 'otro'
  return null
}

/** Siglas conocidas. Solo las que son de uso común y no ambiguas. */
const ALIAS: [RegExp, string[]][] = [
  [/^Escuela Superior de C[oó]mputo/i, ['ESCOM']],
  [/^Escuela Superior de Ingenier[ií]a Mec[aá]nica y El[eé]ctrica$/i, ['ESIME']],
  [/^Escuela Superior de Ingenier[ií]a y Arquitectura/i, ['ESIA']],
  [/^Escuela Superior de F[ií]sica y Matem[aá]ticas/i, ['ESFM']],
  [/^Escuela Superior de Ingenier[ií]a Qu[ií]mica e Industrias Extractivas/i, ['ESIQIE']],
  [/^Escuela Superior de Ingenier[ií]a Textil/i, ['ESIT']],
  [/^Centro de Investigaci[oó]n en Computaci[oó]n/i, ['CIC']],
  [/^Centro de Innovaci[oó]n y Desarrollo Tecnol[oó]gico en C[oó]mputo/i, ['CIDETEC']],
  [/^Escuela Nacional de Ciencias Biol[oó]gicas/i, ['ENCB']],
  [/^Direcci[oó]n de Administraci[oó]n Escolar/i, ['DAE']],
  [/^Escuela Superior de Medicina/i, ['ESM']],
  [/^Escuela Superior de Econom[ií]a/i, ['ESE']],
  [/^Escuela Superior de Comercio y Administraci[oó]n/i, ['ESCA']],
  [/^Escuela Superior de Enfermer[ií]a/i, ['ESEO']],
  [/^Centro Interdisciplinario de Ciencias de la Salud/i, ['CICS']],
  [
    /^Centro de Estudios Cient[ií]ficos y Tecnol[oó]gicos (N[°o.]+ ?)?11\b/i,
    ['CECYT 11'],
  ],
  [/^Centro de Lenguas Extranjeras/i, ['CENLEX']],
]

export function aliasPara(nombre: string): string[] | undefined {
  return ALIAS.find(([re]) => re.test(nombre))?.[1]
}
