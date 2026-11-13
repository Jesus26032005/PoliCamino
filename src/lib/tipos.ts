export const CATEGORIAS = [
  'escuela',
  'biblioteca',
  'laboratorio',
  'cafeteria',
  'servicio',
  'deporte',
  'cultura',
  'acceso',
  'transporte',
  'baños',
  'otro',
] as const

export type Categoria = (typeof CATEGORIAS)[number]

/** [latitud, longitud] */
export type LatLng = [number, number]

export type CampusId = 'zacatenco' | 'santo-tomas'

export type Campus = {
  id: CampusId
  nombre: string
  centro: LatLng
  zoom: number
  /** Esquinas [suroeste, noreste]. */
  limites: [LatLng, LatLng]
}

export type Lugar = {
  id: string
  campusId: CampusId
  nombre: string
  /** Siglas y nombres comunes (ej. "ESCOM"). */
  alias?: string[]
  categoria: Categoria
  coordenadas: LatLng
  edificio?: string
  descripcion?: string
  horario?: string
  /** De dónde salió el dato. */
  fuente?: string
  /** true solo si alguien confirmó el dato en campo o con fuente oficial. */
  verificado: boolean
  /** Id en OpenStreetMap, ej. "way/293807730". */
  osmId?: string
  /** Fecha ISO (YYYY-MM-DD) de la última consulta a la fuente. */
  actualizado?: string
}
