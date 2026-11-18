import { layers, namedFlavor, type Flavor } from '@protomaps/basemaps'
import type { LayerSpecification, StyleSpecification } from 'maplibre-gl'
import mapaBase from '../../data/mapa-base.json'

/**
 * Estilo propio del mapa base.
 *
 * - Teselas: un solo archivo PMTiles con la zona de los campus (scripts/extraer_mapa.py),
 *   servido por el propio sitio. Sin servidores de mapas externos.
 * - Capas: las del basemap de Protomaps (esquema v4) con colores propios, sin las que
 *   necesitan un sprite externo (POIs, escudos, flechas de sentido) porque estorban a
 *   nuestros marcadores.
 * - Edificios en 3D (opcional): extrusión con la altura de OSM; si falta, una estimada.
 */

export const FUENTE_BASE = 'base'
export const CAPA_EDIFICIOS = 'buildings'
export const CAPA_EDIFICIOS_3D = 'edificios-3d'
/** Altura (m) que se usa en 3D cuando OSM no trae la del edificio (≈ 3 pisos). */
export const ALTURA_ESTIMADA_M = 9
/** Tipografías incluidas en public/glifos (las únicas que pueden usar las capas). */
export const TIPOGRAFIAS = [
  'Noto Sans Regular',
  'Noto Sans Medium',
  'Noto Sans Italic',
] as const

/** Capas del basemap que dependen de un sprite de íconos (no lo cargamos). */
const CAPAS_CON_SPRITE = new Set([
  'roads_oneway',
  'roads_shields',
  'pois',
  'places_locality',
])

/** Archivo del mapa base; la versión cambia la URL y renueva la copia sin conexión. */
export const RUTA_MAPA = `/mapa/ipn.pmtiles?v=${mapaBase.build}`

const ATRIBUCION =
  '<a href="https://protomaps.com" target="_blank" rel="noopener">Protomaps</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'

/*
 * Colores. Claro: neutros cálidos con los campus apenas teñidos de guinda.
 * Oscuro: calles visibles sobre fondo casi negro (el estilo oscuro anterior se perdía).
 */
const CLARO: Partial<Flavor> = {
  background: '#ece9e3',
  earth: '#efece6',
  park_a: '#d8e5cf',
  park_b: '#d8e5cf',
  wood_a: '#d3e1c9',
  wood_b: '#d3e1c9',
  scrub_a: '#dfe6d6',
  scrub_b: '#dfe6d6',
  school: '#f0e4e7',
  hospital: '#efe3e3',
  industrial: '#e6e2db',
  pedestrian: '#f4f1eb',
  water: '#c3d7e6',
  buildings: '#dbd5cb',
  minor_a: '#ffffff',
  minor_b: '#ffffff',
  minor_service: '#fbfaf7',
  other: '#f7f5f0',
  link: '#ffffff',
  major: '#ffffff',
  highway: '#fffaf0',
  minor_casing: '#ddd7cc',
  link_casing: '#d7d0c4',
  major_casing_early: '#d3ccbf',
  major_casing_late: '#d3ccbf',
  highway_casing_early: '#cfc6b6',
  highway_casing_late: '#cfc6b6',
  roads_label_minor: '#5c606c',
  roads_label_minor_halo: '#ffffff',
  roads_label_major: '#4a4f5e',
  roads_label_major_halo: '#ffffff',
  subplace_label: '#6b6f7b',
  subplace_label_halo: '#efece6',
  city_label: '#4a4f5e',
  city_label_halo: '#efece6',
  address_label: '#8a8d96',
  address_label_halo: '#efece6',
}

const OSCURO: Partial<Flavor> = {
  background: '#111317',
  earth: '#16181d',
  park_a: '#17251e',
  park_b: '#17251e',
  wood_a: '#16241c',
  wood_b: '#16241c',
  scrub_a: '#192219',
  scrub_b: '#192219',
  school: '#1e191c',
  hospital: '#231a1a',
  industrial: '#1b1c20',
  pedestrian: '#1d1f25',
  water: '#13202d',
  buildings: '#252830',
  minor_a: '#2c3039',
  minor_b: '#2c3039',
  minor_service: '#262a32',
  other: '#262a32',
  link: '#363b46',
  major: '#3a404c',
  highway: '#454b58',
  minor_casing: '#16181d',
  link_casing: '#16181d',
  major_casing_early: '#16181d',
  major_casing_late: '#16181d',
  highway_casing_early: '#16181d',
  highway_casing_late: '#16181d',
  roads_label_minor: '#a9a6b2',
  roads_label_minor_halo: '#16181d',
  roads_label_major: '#c4c1cc',
  roads_label_major_halo: '#16181d',
  subplace_label: '#9d9aa6',
  subplace_label_halo: '#16181d',
  city_label: '#c4c1cc',
  city_label_halo: '#16181d',
  address_label: '#7d7a86',
  address_label_halo: '#16181d',
}

export function sabor(oscuro: boolean): Flavor {
  return { ...namedFlavor(oscuro ? 'dark' : 'light'), ...(oscuro ? OSCURO : CLARO) }
}

function capaEdificios3D(oscuro: boolean, visible: boolean): LayerSpecification {
  return {
    id: CAPA_EDIFICIOS_3D,
    type: 'fill-extrusion',
    source: FUENTE_BASE,
    'source-layer': 'buildings',
    minzoom: 14.5,
    layout: { visibility: visible ? 'visible' : 'none' },
    paint: {
      'fill-extrusion-color': oscuro ? '#2e323c' : '#d6cfc3',
      'fill-extrusion-height': ['coalesce', ['get', 'height'], ALTURA_ESTIMADA_M],
      'fill-extrusion-base': ['coalesce', ['get', 'min_height'], 0],
      'fill-extrusion-opacity': 0.92,
    },
  }
}

type Opciones = {
  oscuro: boolean
  /** Origen del sitio (ej. "https://rutapoli.pages.dev"); MapLibre necesita URLs absolutas. */
  origen: string
  /** Edificios en 3D visibles al cargar el estilo. */
  tresD?: boolean
}

export function crearEstilo({
  oscuro,
  origen,
  tresD = false,
}: Opciones): StyleSpecification {
  const generadas = layers(FUENTE_BASE, sabor(oscuro), { lang: 'es' }).filter(
    (c) => !CAPAS_CON_SPRITE.has(c.id),
  )
  // Las capas piden una tipografía para devanagari que no incluimos: se usa la regular.
  const base = JSON.parse(
    JSON.stringify(generadas).replace(
      /Noto Sans Devanagari Regular v1/g,
      'Noto Sans Regular',
    ),
  ) as LayerSpecification[]
  const i = base.findIndex((c) => c.id === CAPA_EDIFICIOS)
  const capas = [
    ...base.slice(0, i + 1),
    capaEdificios3D(oscuro, tresD),
    ...base.slice(i + 1),
  ]
  return {
    version: 8,
    glyphs: `${origen}/glifos/{fontstack}/{range}.pbf`,
    sources: {
      [FUENTE_BASE]: {
        type: 'vector',
        url: `pmtiles://${origen}${RUTA_MAPA}`,
        attribution: ATRIBUCION,
      },
    },
    layers: capas,
  }
}
