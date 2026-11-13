import type { Campus, CampusId } from '../lib/tipos'

export const CAMPUS: Record<'zacatenco', Campus> = {
  zacatenco: {
    id: 'zacatenco',
    nombre: 'Zacatenco',
    centro: [19.5019, -99.1402],
    zoom: 15,
    // Caja del polígono del campus (OSM way/81453020) más ~450 m de margen.
    limites: [
      [19.4905, -99.1529],
      [19.5133, -99.1275],
    ],
  },
}

export const CAMPUS_INICIAL = 'zacatenco' as const satisfies CampusId
