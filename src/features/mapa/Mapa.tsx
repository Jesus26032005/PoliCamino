import {
  AttributionControl,
  LngLatBounds,
  Map as MapaGL,
  Marker,
  NavigationControl,
  type GeoJSONSource,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'
import { cajaDeGeometria, dentroDeLimites } from '../../lib/geo'
import { lugaresAGeoJSON } from '../../lib/lugares'
import { RUTA_VACIA, type RutaGeoJSON } from '../../lib/ruta'
import { leerToken, useTemaOscuro } from '../../lib/tema'
import type { Campus, Lugar } from '../../lib/tipos'
import type { Ubicacion } from '../ubicacion/useUbicacion'
import { registrarIconos } from './iconos'

const ESTILO_CLARO = 'https://tiles.openfreemap.org/styles/positron'
const ESTILO_OSCURO = 'https://tiles.openfreemap.org/styles/dark'

/** Grados extra alrededor de `campus.limites` en los que se puede navegar. */
const HOLGURA = 0.02

const FUENTE = 'lugares'
const RUTA = 'ruta'
const LIMITE = 'campus-limite'

/** Polígono del campus en GeoJSON (Polygon o MultiPolygon). */
export type LimiteCampus = {
  type: 'Feature'
  properties: Record<string, unknown>
  geometry: Parameters<typeof cajaDeGeometria>[0]
}
const SIN_LIMITE = { type: 'FeatureCollection', features: [] } as const

type Props = {
  campus: Campus
  /** Polígono del campus; null mientras se carga. */
  limite: LimiteCampus | null
  /** Lugares visibles (ya filtrados). */
  lugares: Lugar[]
  seleccionado: Lugar | null
  onSeleccionar: (id: string | null) => void
  ubicacion: Ubicacion | null
  /** Ruta a dibujar (línea + origen y destino) o null. */
  ruta: RutaGeoJSON | null
  /** Espacio (px) que tapan la barra y el panel en cada borde, para encuadrar lo visible. */
  obtenerRelleno: () => Relleno
}

export type Relleno = { top: number; right: number; bottom: number; left: number }

const conMargen = (r: Relleno, m: number): Relleno => ({
  top: r.top + m,
  right: r.right + m,
  bottom: r.bottom + m,
  left: r.left + m,
})

/** Desplazamiento que centra un punto en la zona libre del mapa (no en toda la pantalla). */
const centroLibre = (r: Relleno): [number, number] => [
  (r.left - r.right) / 2,
  (r.top - r.bottom) / 2,
]

const tamanoIcono = (seleccionadoId: string | null) =>
  ['case', ['==', ['get', 'id'], seleccionadoId ?? ''], 1.3, 1] as never

function instalarCapas(
  map: MapaGL,
  lugares: Lugar[],
  seleccionadoId: string | null,
  ruta: RutaGeoJSON,
  limite: LimiteCampus | null,
) {
  registrarIconos(map)
  const primario = leerToken('--c-primary')

  map.addSource(LIMITE, { type: 'geojson', data: (limite ?? SIN_LIMITE) as never })
  map.addLayer({
    id: `${LIMITE}-relleno`,
    type: 'fill',
    source: LIMITE,
    paint: { 'fill-color': primario, 'fill-opacity': 0.06 },
  })
  map.addLayer({
    id: `${LIMITE}-linea`,
    type: 'line',
    source: LIMITE,
    paint: { 'line-color': primario, 'line-width': 2, 'line-dasharray': [3, 2] },
  })

  map.addSource(FUENTE, {
    type: 'geojson',
    data: lugaresAGeoJSON(lugares) as never,
    cluster: true,
    clusterRadius: 44,
    clusterMaxZoom: 15,
  })
  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: FUENTE,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': primario,
      'circle-radius': ['step', ['get', 'point_count'], 18, 10, 22, 30, 26],
      'circle-stroke-width': 3,
      'circle-stroke-color': '#ffffff',
    },
  })
  map.addLayer({
    id: 'clusters-conteo',
    type: 'symbol',
    source: FUENTE,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['Noto Sans Bold'],
      'text-size': 14,
    },
    paint: { 'text-color': leerToken('--c-on-primary') },
  })
  map.addLayer({
    id: 'lugares-puntos',
    type: 'symbol',
    source: FUENTE,
    filter: ['!', ['has', 'point_count']],
    layout: {
      'icon-image': ['concat', 'icono-', ['get', 'categoria']],
      'icon-size': tamanoIcono(seleccionadoId),
      'icon-allow-overlap': true,
    },
  })

  // Ruta a pie: debajo de los íconos de lugares, por encima del mapa base.
  const colorRuta = leerToken('--c-route')
  map.addSource(RUTA, { type: 'geojson', data: ruta as never })
  map.addLayer(
    {
      id: 'ruta-borde',
      type: 'line',
      source: RUTA,
      filter: ['==', ['get', 'rol'], 'ruta'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#ffffff', 'line-width': 9 },
    },
    'clusters',
  )
  map.addLayer(
    {
      id: 'ruta-linea',
      type: 'line',
      source: RUTA,
      filter: ['==', ['get', 'rol'], 'ruta'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': colorRuta, 'line-width': 5 },
    },
    'clusters',
  )
  map.addLayer(
    {
      id: 'ruta-puntos',
      type: 'circle',
      source: RUTA,
      filter: ['!=', ['get', 'rol'], 'ruta'],
      paint: {
        'circle-radius': 8,
        'circle-color': ['case', ['==', ['get', 'rol'], 'destino'], colorRuta, '#ffffff'],
        'circle-stroke-color': colorRuta,
        'circle-stroke-width': 4,
      },
    },
    'clusters',
  )
}

export function Mapa({
  campus,
  limite,
  lugares,
  seleccionado,
  onSeleccionar,
  ubicacion,
  ruta,
  obtenerRelleno,
}: Props) {
  const seleccionadoId = seleccionado?.id ?? null
  const contenedor = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapaGL | null>(null)
  const oscuro = useTemaOscuro()
  const campus0 = useRef(campus) // posición inicial de la cámara

  // Los manejadores se registran una sola vez; leen siempre lo más reciente.
  const ultimo = useRef({
    lugares,
    seleccionadoId,
    onSeleccionar,
    oscuro,
    ruta,
    limite,
    obtenerRelleno,
  })
  useEffect(() => {
    ultimo.current = {
      lugares,
      seleccionadoId,
      onSeleccionar,
      oscuro,
      ruta,
      limite,
      obtenerRelleno,
    }
  })

  // El mapa se crea una sola vez; al cambiar de campus solo se mueve la cámara.
  useEffect(() => {
    const map = new MapaGL({
      container: contenedor.current!,
      style: ultimo.current.oscuro ? ESTILO_OSCURO : ESTILO_CLARO,
      center: [campus0.current.centro[1], campus0.current.centro[0]],
      zoom: campus0.current.zoom,
      minZoom: 13,
      attributionControl: false,
    })
    mapRef.current = map
    // Abajo a la derecha; en móvil el CSS los sube para que la hoja inferior
    // nunca tape la atribución de OSM (ver --mapa-abajo en index.css).
    map.addControl(new AttributionControl({ compact: true }), 'bottom-right')
    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right')

    // Se dispara en la carga inicial y cada vez que cambia el estilo (tema).
    map.on('style.load', () => {
      const u = ultimo.current
      instalarCapas(map, u.lugares, u.seleccionadoId, u.ruta ?? RUTA_VACIA, u.limite)
    })

    map.on('click', 'lugares-puntos', (ev) => {
      const id = ev.features?.[0]?.properties?.id as string | undefined
      if (id) ultimo.current.onSeleccionar(id)
    })
    map.on('click', 'clusters', async (ev) => {
      const f = ev.features?.[0]
      if (!f) return
      const fuente = map.getSource(FUENTE) as GeoJSONSource
      const zoom = await fuente.getClusterExpansionZoom(f.properties.cluster_id)
      const [lng, lat] = (f.geometry as { coordinates: number[] }).coordinates
      map.easeTo({
        center: [lng, lat],
        zoom,
        offset: centroLibre(ultimo.current.obtenerRelleno()),
      })
    })
    map.on('click', (ev) => {
      const sobre = map.queryRenderedFeatures(ev.point, {
        layers: ['lugares-puntos', 'clusters'],
      })
      if (!sobre.length) ultimo.current.onSeleccionar(null)
    })
    for (const capa of ['lugares-puntos', 'clusters']) {
      map.on('mouseenter', capa, () => (map.getCanvas().style.cursor = 'pointer'))
      map.on('mouseleave', capa, () => (map.getCanvas().style.cursor = ''))
    }

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Encuadre y límites de navegación del campus actual (también al cambiar de campus).
  const encuadrado = useRef<string | null>(null)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !limite) return
    const [[s, o], [n, e]] = campus.limites
    const primera = encuadrado.current === null
    if (encuadrado.current === campus.id) return
    encuadrado.current = campus.id
    const [oeste, sur, este, norte] = cajaDeGeometria(limite.geometry)
    // Sin límites mientras vuela; se fijan al llegar para que no recorten el viaje.
    map.setMaxBounds(null)
    map.fitBounds(
      [
        [oeste, sur],
        [este, norte],
      ],
      {
        padding: conMargen(ultimo.current.obtenerRelleno(), 24),
        duration: primera ? 0 : 1400,
      },
    )
    const fijar = () =>
      // Holgura extra: con una caja ajustada, en pantallas verticales no se vería todo el campus.
      map.setMaxBounds([
        [o - HOLGURA, s - HOLGURA],
        [e + HOLGURA, n + HOLGURA],
      ])
    if (primera) fijar()
    else map.once('moveend', fijar)
  }, [campus, limite])

  // El polígono dibujado sigue al campus.
  useEffect(() => {
    const fuente = mapRef.current?.getSource(LIMITE) as GeoJSONSource | undefined
    fuente?.setData((limite ?? SIN_LIMITE) as never)
  }, [limite])

  // Cambio de tema: otro estilo base; las capas se reinstalan en 'style.load'.
  const primeraVez = useRef(true)
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false
      return
    }
    mapRef.current?.setStyle(oscuro ? ESTILO_OSCURO : ESTILO_CLARO)
  }, [oscuro])

  // Filtros: al cambiar los lugares visibles se actualiza la fuente del mapa.
  // (Cubre también el caso en que los datos llegan después de crearse el mapa.)
  useEffect(() => {
    const fuente = mapRef.current?.getSource(FUENTE) as GeoJSONSource | undefined
    fuente?.setData(lugaresAGeoJSON(lugares) as never)
  }, [lugares])

  // Lugar seleccionado: agranda su ícono y lo centra en la parte del mapa que queda libre.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (map.getLayer('lugares-puntos'))
      map.setLayoutProperty('lugares-puntos', 'icon-size', tamanoIcono(seleccionadoId))
    if (seleccionado) {
      map.easeTo({
        center: [seleccionado.coordenadas[1], seleccionado.coordenadas[0]],
        zoom: Math.max(map.getZoom(), 16.5),
        offset: centroLibre(ultimo.current.obtenerRelleno()),
        duration: 500,
      })
    }
  }, [seleccionado, seleccionadoId])

  // Ruta: se actualiza la línea y se encuadra en la parte libre del mapa.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const fuente = map.getSource(RUTA) as GeoJSONSource | undefined
    fuente?.setData((ruta ?? RUTA_VACIA) as never)
    const linea = ruta?.features.find((f) => f.geometry.type === 'LineString')
    if (!linea || linea.geometry.type !== 'LineString') return
    const caja = linea.geometry.coordinates.reduce(
      (b, c) => b.extend(c),
      new LngLatBounds(linea.geometry.coordinates[0], linea.geometry.coordinates[0]),
    )
    map.fitBounds(caja, {
      padding: conMargen(ultimo.current.obtenerRelleno(), 48),
      maxZoom: 17,
      duration: 700,
    })
  }, [ruta])

  // Punto azul de "¿Dónde estoy?". Solo si cae cerca del campus (el mapa no sale de ahí).
  const marcadorUsuario = useRef<Marker | null>(null)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ubicacion) return
    if (!dentroDeLimites(ubicacion.lat, ubicacion.lng, campus.limites, HOLGURA)) return
    if (!marcadorUsuario.current) {
      const el = document.createElement('div')
      el.className = 'punto-usuario'
      el.setAttribute('role', 'img')
      el.setAttribute('aria-label', 'Tu ubicación')
      marcadorUsuario.current = new Marker({ element: el })
    }
    marcadorUsuario.current.setLngLat([ubicacion.lng, ubicacion.lat]).addTo(map)
    map.easeTo({
      center: [ubicacion.lng, ubicacion.lat],
      zoom: Math.max(map.getZoom(), 17),
      offset: centroLibre(ultimo.current.obtenerRelleno()),
      duration: 600,
    })
  }, [ubicacion, campus])

  return (
    // Envoltorio con tamaño definido: el CSS de MapLibre fuerza position:relative
    // en su contenedor, así que el posicionamiento absoluto va en el padre.
    <div className="absolute inset-0">
      <div
        ref={contenedor}
        className="h-full w-full"
        role="application"
        aria-label={`Mapa del campus ${campus.nombre}`}
      />
    </div>
  )
}
