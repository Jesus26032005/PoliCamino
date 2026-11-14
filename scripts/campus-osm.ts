import type { CampusId } from '../src/lib/tipos.ts'

/**
 * De dónde sale el polígono de cada campus en OpenStreetMap.
 * Para agregar un campus: busca en openstreetmap.org la vía (way) o relación (relation)
 * que lo delimita y añade aquí su tipo e id (ver README, "Cómo agregar un campus").
 */
export const CAMPUS_OSM: Record<CampusId, { tipo: 'way' | 'relation'; id: number }> = {
  zacatenco: { tipo: 'way', id: 81453020 }, // IPN Unidad Profesional Adolfo López Mateos
  'santo-tomas': { tipo: 'relation', id: 12512609 }, // Casco de Santo Tomás IPN (4 parcelas)
}
