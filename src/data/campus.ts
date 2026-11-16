import type { Campus, CampusId } from '../lib/tipos.ts'

/**
 * Campus disponibles. Para agregar uno nuevo, ver "Cómo agregar un campus" en el README.
 * `limites` = caja del polígono del campus (OSM) más ~450 m de margen, [suroeste, noreste].
 */
export const CAMPUS: Record<CampusId, Campus> = {
  zacatenco: {
    id: 'zacatenco',
    nombre: 'Zacatenco',
    nombreLargo: 'Unidad Profesional Adolfo López Mateos',
    centro: [19.5019, -99.1402],
    zoom: 15,
    // Polígono: OSM way/81453020.
    limites: [
      [19.4905, -99.1529],
      [19.5133, -99.1275],
    ],
  },
  'santo-tomas': {
    id: 'santo-tomas',
    nombre: 'Santo Tomás',
    nombreLargo: 'Casco de Santo Tomás',
    centro: [19.4535, -99.1687],
    zoom: 16,
    // Polígono: OSM relation/12512609 (Casco de Santo Tomás, 4 parcelas).
    limites: [
      [19.4465, -99.1773],
      [19.4606, -99.16],
    ],
  },
}

/** Orden en el selector. */
export const CAMPUS_LISTA: Campus[] = [CAMPUS.zacatenco, CAMPUS['santo-tomas']]

export const CAMPUS_INICIAL: CampusId = 'zacatenco'

export const esCampusId = (x: unknown): x is CampusId =>
  typeof x === 'string' && Object.hasOwn(CAMPUS, x)
