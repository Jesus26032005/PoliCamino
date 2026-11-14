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

export const VALORES_ENCHUFES = ['muchos', 'pocos', 'no'] as const
export const VALORES_SILENCIO = ['silencioso', 'moderado', 'ruidoso'] as const
export type ValorEnchufes = (typeof VALORES_ENCHUFES)[number]
export type ValorSilencio = (typeof VALORES_SILENCIO)[number]

/** Un dato aportado por la comunidad: siempre con fuente, fecha y marca de verificación. */
export type Atributo<V> = {
  valor: V
  /** Cómo se obtuvo, ej. "Visita de Ana a la biblioteca" o "Reporte de la escuela". */
  fuente: string
  /** Fecha ISO (AAAA-MM-DD) en que se comprobó. */
  fecha: string
  verificado: boolean
}

export type Servicios = {
  enchufes?: Atributo<ValorEnchufes>
  silencio?: Atributo<ValorSilencio>
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
  /** Enchufes y silencio; viene de `<campus>.servicios.json`, no de OSM. */
  servicios?: Servicios
}
