import {
  addProtocol,
  AttributionControl,
  LngLatBounds,
  Map as MapaGL,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type IControl,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// El worker de MapLibre se importa como URL para que Vite lo copie al build. Sin esto,
// MapLibre lo busca junto a su propio módulo y en producción el mapa no carga.
import urlWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { PMTiles, Protocol } from 'pmtiles'
import { useEffect, useRef } from 'react'
import { cajaDeGeometria, dentroDeLimites } from '../../lib/geo'
import { lugaresAGeoJSON } from '../../lib/lugares'
import { RUTA_VACIA, type RutaGeoJSON } from '../../lib/ruta'
import { leerToken, useTemaOscuro } from '../../lib/tema'
import type { Campus, Lugar } from '../../lib/tipos'
import type { Ubicacion } from '../ubicacion/useUbicacion'
import {
  ALTURA_ESTIMADA_M,
  CAPA_EDIFICIOS,
  CAPA_EDIFICIOS_3D,
  crearEstilo,
} from './estilo'
import { registrarIconos } from './iconos'
import { fuenteMapa, guardarMapaOffline } from './mapaOffline'

setWorkerUrl(urlWorker)
// El mapa base es un archivo PMTiles: MapLibre lo lee con este protocolo (pmtiles://),
// y los bytes salen de nuestra fuente (rangos, archivo completo o copia guardada).
const protocolo = new Protocol()
protocolo.add(new PMTiles(fuenteMapa))
addProtocol('pmtiles', protocolo.tile)

const estiloPara = (oscuro: boolean, tresD: boolean) =>
  crearEstilo({ oscuro, tresD, origen: window.location.origin })

/** Grados extra alrededor de `campus.limites` en los que se puede navegar. */
const HOLGURA = 0.02

const FUENTE = 'lugares'
const RUTA = 'ruta'
const LIMITE = 'campus-limite'
const SELECCION = 'edificio-seleccionado'

/** Polígono del campus en GeoJSON (Polygon o MultiPolygon). */
export type LimiteCampus = {
  type: 'Feature'
  properties: Record<string, unknown>
  geometry: Parameters<typeof cajaDeGeometria>[0]
}
const VACIO = { type: 'FeatureCollection', features: [] } as const

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
/** Distancia (em) del nombre a su ícono; el elegido es 1.3 veces más grande. */
const distanciaNombre = (seleccionadoId: string | null) =>
  ['case', ['==', ['get', 'id'], seleccionadoId ?? ''], 2.4, 1.9] as never
/** El lugar elegido se coloca primero: si algo choca con él, se oculta lo otro. */
const ordenIcono = (seleccionadoId: string | null) =>
  ['case', ['==', ['get', 'id'], seleccionadoId ?? ''], 0, 1] as never

/** Textos de los controles de MapLibre (por defecto vienen en inglés). */
const TEXTOS_MAPA = {
  'AttributionControl.ToggleAttribution': 'Mostrar u ocultar créditos del mapa',
  'AttributionControl.MapFeedback': 'Reportar un error del mapa',
  'Map.Title': 'Mapa',
  'Marker.Title': 'Marcador',
  'NavigationControl.ResetBearing': 'Girar el mapa; clic para apuntar al norte',
  'NavigationControl.ZoomIn': 'Acercar',
  'NavigationControl.ZoomOut': 'Alejar',
  'Popup.Close': 'Cerrar',
}

/** Botón «3D» junto al zoom: inclina el mapa y levanta los edificios. */
class Control3D implements IControl {
  private contenedor = document.createElement('div')
  private boton = document.createElement('button')
  private alCambiar: (activo: boolean) => void

  constructor(alCambiar: (activo: boolean) => void) {
    this.alCambiar = alCambiar
  }

  onAdd() {
    this.contenedor.className = 'maplibregl-ctrl maplibregl-ctrl-group'
    this.boton.type = 'button'
    this.boton.className = 'control-3d'
    this.boton.textContent = '3D'
    this.fijar(false)
    this.boton.addEventListener('click', () => {
      const activo = this.boton.getAttribute('aria-pressed') !== 'true'
      this.fijar(activo)
      this.alCambiar(activo)
    })
    this.contenedor.append(this.boton)
    return this.contenedor
  }

  onRemove() {
    this.contenedor.remove()
  }

  fijar(activo: boolean) {
    this.boton.setAttribute('aria-pressed', String(activo))
    const texto = activo ? 'Volver a la vista 2D' : 'Ver edificios en 3D'
    this.boton.setAttribute('aria-label', texto)
    this.boton.title = texto
  }
}

function instalarCapas(
  map: MapaGL,
  lugares: Lugar[],
  seleccionadoId: string | null,
  ruta: RutaGeoJSON,
  limite: LimiteCampus | null,
  tresD: boolean,
  oscuro: boolean,
) {
  registrarIconos(map)
  const primario = leerToken('--c-primary')
  const tinta = leerToken('--c-ink')
  const sobreTinta = leerToken('--c-on-ink')
  const superficie = leerToken('--c-surface')
  const texto = leerToken('--c-text')
  const colorRuta = leerToken('--c-route')

  // Polígono del campus.
  map.addSource(LIMITE, { type: 'geojson', data: (limite ?? VACIO) as never })
  map.addLayer({
    id: `${LIMITE}-relleno`,
    type: 'fill',
    source: LIMITE,
    paint: { 'fill-color': primario, 'fill-opacity': oscuro ? 0.035 : 0.06 },
  })
  map.addLayer({
    id: `${LIMITE}-linea`,
    type: 'line',
    source: LIMITE,
    paint: { 'line-color': primario, 'line-width': 2, 'line-dasharray': [3, 2] },
  })

  // Edificio del lugar elegido (contorno en 2D, volumen en 3D).
  map.addSource(SELECCION, { type: 'geojson', data: VACIO as never })
  map.addLayer({
    id: `${SELECCION}-relleno`,
    type: 'fill',
    source: SELECCION,
    paint: { 'fill-color': primario, 'fill-opacity': 0.25 },
  })
  map.addLayer({
    id: `${SELECCION}-linea`,
    type: 'line',
    source: SELECCION,
    paint: { 'line-color': primario, 'line-width': 2.5 },
  })
  map.addLayer({
    id: `${SELECCION}-3d`,
    type: 'fill-extrusion',
    source: SELECCION,
    layout: { visibility: tresD ? 'visible' : 'none' },
    paint: {
      'fill-extrusion-color': primario,
      'fill-extrusion-height': [
        '+',
        ['coalesce', ['get', 'height'], ALTURA_ESTIMADA_M],
        0.5,
      ],
      'fill-extrusion-base': ['coalesce', ['get', 'min_height'], 0],
      'fill-extrusion-opacity': 0.85,
    },
  })

  // Lugares: grupos (clusters) discretos que se separan al acercarse.
  map.addSource(FUENTE, {
    type: 'geojson',
    data: lugaresAGeoJSON(lugares) as never,
    cluster: true,
    // Radio amplio: menos círculos «2» y «3» sueltos en la vista general.
    clusterRadius: 52,
    clusterMaxZoom: 15,
  })
  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: FUENTE,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': tinta,
      'circle-opacity': 0.88,
      'circle-radius': ['step', ['get', 'point_count'], 14, 10, 17, 30, 20],
      'circle-stroke-width': 2,
      'circle-stroke-color': superficie,
    },
  })
  map.addLayer({
    id: 'clusters-conteo',
    type: 'symbol',
    source: FUENTE,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['Noto Sans Medium'],
      'text-size': 12,
      'text-allow-overlap': true,
    },
    paint: { 'text-color': sobreTinta },
  })

  // Ruta a pie: por encima de los grupos y debajo de los íconos de lugares.
  map.addSource(RUTA, { type: 'geojson', data: ruta as never })
  map.addLayer({
    id: 'ruta-borde',
    type: 'line',
    source: RUTA,
    filter: ['==', ['get', 'rol'], 'ruta'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#ffffff', 'line-width': 9 },
  })
  map.addLayer({
    id: 'ruta-linea',
    type: 'line',
    source: RUTA,
    filter: ['==', ['get', 'rol'], 'ruta'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': colorRuta, 'line-width': 5 },
  })
  map.addLayer({
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
  })

  // Nombres bajo los íconos al acercarse. Van en una capa DEBAJO de los íconos: MapLibre
  // coloca primero las capas de arriba, así que cada nombre esquiva todos los íconos ya
  // puestos (si no cabe en ningún lado, se oculta y queda solo el ícono).
  map.addLayer({
    id: 'lugares-nombres',
    type: 'symbol',
    source: FUENTE,
    filter: ['!', ['has', 'point_count']],
    minzoom: 16,
    layout: {
      'text-field': ['get', 'etiqueta'],
      'text-font': ['Noto Sans Medium'],
      'text-size': 12,
      'text-variable-anchor': ['top', 'bottom', 'right', 'left'],
      'text-radial-offset': distanciaNombre(seleccionadoId),
      'text-justify': 'auto',
      'text-max-width': 8,
      'text-padding': 1,
      'symbol-sort-key': ordenIcono(seleccionadoId),
    },
    paint: { 'text-color': texto, 'text-halo-color': superficie, 'text-halo-width': 1.6 },
  })
  // Íconos. En 3D la perspectiva junta los puntos: ahí se ocultan los que chocan
  // (el elegido se coloca primero y siempre queda).
  map.addLayer({
    id: 'lugares-puntos',
    type: 'symbol',
    source: FUENTE,
    filter: ['!', ['has', 'point_count']],
    layout: {
      'icon-image': ['concat', 'icono-', ['get', 'categoria']],
      'icon-size': tamanoIcono(seleccionadoId),
      'icon-allow-overlap': !tresD,
      'symbol-sort-key': ordenIcono(seleccionadoId),
    },
  })
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
  const tresD = useRef(false)
  // Campus ya encuadrado en el mapa actual (se reinicia si el mapa se vuelve a crear).
  const encuadrado = useRef<string | null>(null)

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
      style: estiloPara(ultimo.current.oscuro, false),
      center: [campus0.current.centro[1], campus0.current.centro[0]],
      zoom: campus0.current.zoom,
      minZoom: 13,
      maxPitch: 60,
      // Rendimiento en celulares: pantallas de 3× se dibujan a 2× (casi no se nota y
      // ahorra mucha GPU) y sin animación de aparición de teselas y etiquetas.
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      fadeDuration: 0,
      attributionControl: false,
      locale: TEXTOS_MAPA,
    })
    mapRef.current = map
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__mapa = map // pruebas
    // Abajo a la derecha; en móvil el CSS los sube para que la hoja inferior
    // nunca tape la atribución de OSM (ver --mapa-abajo en index.css).
    map.addControl(new AttributionControl({ compact: true }), 'bottom-right')
    map.addControl(
      new NavigationControl({ showCompass: true, visualizePitch: true }),
      'bottom-right',
    )
    map.addControl(
      new Control3D((activo) => {
        tresD.current = activo
        for (const id of [CAPA_EDIFICIOS_3D, `${SELECCION}-3d`])
          if (map.getLayer(id))
            map.setLayoutProperty(id, 'visibility', activo ? 'visible' : 'none')
        if (map.getLayer('lugares-puntos'))
          map.setLayoutProperty('lugares-puntos', 'icon-allow-overlap', !activo)
        map.easeTo({
          pitch: activo ? 55 : 0,
          bearing: activo ? -17 : 0,
          zoom: activo ? Math.max(map.getZoom(), 16) : map.getZoom(),
          duration: 900,
        })
      }),
      'bottom-right',
    )

    // Se dispara en la carga inicial y cada vez que cambia el estilo (tema).
    map.on('style.load', () => {
      const u = ultimo.current
      instalarCapas(
        map,
        u.lugares,
        u.seleccionadoId,
        u.ruta ?? RUTA_VACIA,
        u.limite,
        tresD.current,
        u.oscuro,
      )
    })

    // Con el mapa ya visible, se guarda una copia para usarlo sin conexión.
    map.once('idle', () => window.setTimeout(() => void guardarMapaOffline(), 2500))

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
      encuadrado.current = null
    }
  }, [])

  // Encuadre y límites de navegación del campus actual (también al cambiar de campus).
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
    fuente?.setData((limite ?? VACIO) as never)
  }, [limite])

  // Cambio de tema: otro estilo base; las capas propias se reinstalan en 'style.load'.
  const primeraVez = useRef(true)
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false
      return
    }
    mapRef.current?.setStyle(estiloPara(oscuro, tresD.current), { diff: false })
  }, [oscuro])

  // Filtros: al cambiar los lugares visibles se actualiza la fuente del mapa.
  // (Cubre también el caso en que los datos llegan después de crearse el mapa.)
  useEffect(() => {
    const fuente = mapRef.current?.getSource(FUENTE) as GeoJSONSource | undefined
    fuente?.setData(lugaresAGeoJSON(lugares) as never)
  }, [lugares])

  // Lugar seleccionado: agranda su ícono, lo centra en la zona libre y resalta su edificio.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (map.getLayer('lugares-puntos')) {
      map.setLayoutProperty('lugares-puntos', 'icon-size', tamanoIcono(seleccionadoId))
      map.setLayoutProperty('lugares-puntos', 'symbol-sort-key', ordenIcono(seleccionadoId))
      map.setLayoutProperty('lugares-nombres', 'symbol-sort-key', ordenIcono(seleccionadoId))
      map.setLayoutProperty('lugares-nombres', 'text-radial-offset', distanciaNombre(seleccionadoId))
    }
    const fuenteSel = () => map.getSource(SELECCION) as GeoJSONSource | undefined
    fuenteSel()?.setData(VACIO as never)
    if (!seleccionado) return

    const [lat, lng] = seleccionado.coordenadas
    map.easeTo({
      center: [lng, lat],
      zoom: Math.max(map.getZoom(), 16.5),
      offset: centroLibre(ultimo.current.obtenerRelleno()),
      duration: 500,
    })
    // Cuando terminan la animación y la carga, se busca el edificio bajo el lugar.
    const resaltar = () => {
      if (ultimo.current.seleccionadoId !== seleccionado.id) return
      const capas = [CAPA_EDIFICIOS, CAPA_EDIFICIOS_3D].filter(
        (id) => map.getLayer(id) && map.getLayoutProperty(id, 'visibility') !== 'none',
      )
      const edificio = map
        .queryRenderedFeatures(map.project([lng, lat]), { layers: capas })
        .find((f) => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
      fuenteSel()?.setData(
        (edificio
          ? {
              type: 'Feature',
              properties: {
                height: edificio.properties?.height,
                min_height: edificio.properties?.min_height,
              },
              geometry: edificio.geometry,
            }
          : VACIO) as never,
      )
    }
    map.once('idle', resaltar)
    return () => {
      map.off('idle', resaltar)
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
