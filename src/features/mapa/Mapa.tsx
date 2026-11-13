import {
  AttributionControl,
  Map as MapaGL,
  NavigationControl,
  type GeoJSONSource,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'
import limiteZacatenco from '../../data/zacatenco.limite.json'
import { lugaresAGeoJSON } from '../../lib/lugares'
import { leerToken, useTemaOscuro } from '../../lib/tema'
import type { Campus, Lugar } from '../../lib/tipos'
import { registrarIconos } from './iconos'

const ESTILO_CLARO = 'https://tiles.openfreemap.org/styles/positron'
const ESTILO_OSCURO = 'https://tiles.openfreemap.org/styles/dark'

/** Caja [oeste, sur, este, norte] del polígono del campus. */
function cajaDelLimite(): [number, number, number, number] {
  const anillo = (limiteZacatenco.geometry.coordinates as number[][][])[0]
  const lngs = anillo.map((p) => p[0])
  const lats = anillo.map((p) => p[1])
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)]
}

/** Grados extra alrededor de `campus.limites` en los que se puede navegar. */
const HOLGURA = 0.02

const FUENTE = 'lugares'
const LIMITE = 'campus-limite'

type Props = {
  campus: Campus
  lugares: Lugar[]
  seleccionadoId: string | null
  onSeleccionar: (id: string | null) => void
}

const tamanoIcono = (seleccionadoId: string | null) =>
  ['case', ['==', ['get', 'id'], seleccionadoId ?? ''], 1.3, 1] as never

function instalarCapas(map: MapaGL, lugares: Lugar[], seleccionadoId: string | null) {
  registrarIconos(map)
  const primario = leerToken('--c-primary')

  map.addSource(LIMITE, { type: 'geojson', data: limiteZacatenco as never })
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
}

export function Mapa({ campus, lugares, seleccionadoId, onSeleccionar }: Props) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapaGL | null>(null)
  const oscuro = useTemaOscuro()

  // Los manejadores se registran una sola vez; leen siempre lo más reciente.
  const ultimo = useRef({ lugares, seleccionadoId, onSeleccionar, oscuro })
  useEffect(() => {
    ultimo.current = { lugares, seleccionadoId, onSeleccionar, oscuro }
  })

  useEffect(() => {
    const [[s, o], [n, e]] = campus.limites
    const map = new MapaGL({
      container: contenedor.current!,
      style: ultimo.current.oscuro ? ESTILO_OSCURO : ESTILO_CLARO,
      // Vista inicial: todo el campus, sea cual sea el tamaño de la pantalla.
      bounds: cajaDelLimite(),
      fitBoundsOptions: { padding: 24 },
      minZoom: 13,
      // Holgura extra: con una caja ajustada, en pantallas verticales el mapa
      // no dejaría alejar lo suficiente para ver todo el campus.
      maxBounds: [
        [o - HOLGURA, s - HOLGURA],
        [e + HOLGURA, n + HOLGURA],
      ],
      attributionControl: false,
    })
    mapRef.current = map
    // Arriba a la izquierda para que la hoja inferior nunca tape la atribución de OSM.
    map.addControl(new AttributionControl({ compact: true }), 'top-left')
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')

    // Se dispara en la carga inicial y cada vez que cambia el estilo (tema).
    map.on('style.load', () => {
      const u = ultimo.current
      instalarCapas(map, u.lugares, u.seleccionadoId)
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
      map.easeTo({ center: [lng, lat], zoom })
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
  }, [campus])

  // Cambio de tema: otro estilo base; las capas se reinstalan en 'style.load'.
  const primeraVez = useRef(true)
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false
      return
    }
    mapRef.current?.setStyle(oscuro ? ESTILO_OSCURO : ESTILO_CLARO)
  }, [oscuro])

  // Lugar seleccionado: agranda su ícono y centra el mapa sobre él.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (map.getLayer('lugares-puntos'))
      map.setLayoutProperty('lugares-puntos', 'icon-size', tamanoIcono(seleccionadoId))
    const l = lugares.find((x) => x.id === seleccionadoId)
    if (l) map.easeTo({ center: [l.coordenadas[1], l.coordenadas[0]], duration: 400 })
  }, [seleccionadoId, lugares])

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
