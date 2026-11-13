import { useCallback, useEffect, useMemo, useState } from 'react'
import { Boton } from './components/Boton'
import { Buscador } from './components/Buscador'
import { ChipCategoria } from './components/ChipCategoria'
import { HojaInferior } from './components/HojaInferior'
import { NoticeBanner } from './components/NoticeBanner'
import { CAMPUS, CAMPUS_INICIAL } from './data/campus'
import { DetalleLugar } from './features/lugares/DetalleLugar'
import { Mapa } from './features/mapa/Mapa'
import {
  PanelRuta,
  type Origen,
  type Pestana,
  type PuntoRuta,
} from './features/ruta/PanelRuta'
import { useRuta } from './features/ruta/useRuta'
import { MENSAJE_UBICACION, useUbicacion } from './features/ubicacion/useUbicacion'
import { crearIndice, filtrarPorCategorias } from './lib/busqueda'
import { APP_NAME } from './lib/config'
import { busquedaConLugar, leerLugarDeUrl } from './lib/enlaces'
import { dentroDeLimites } from './lib/geo'
import { cargarLugares } from './lib/lugares'
import { formatearDistancia, formatearDuracion, rutaAGeoJSON } from './lib/ruta'
import { CATEGORIAS, type Categoria, type Lugar } from './lib/tipos'

type Estado =
  | { fase: 'cargando' }
  | { fase: 'error'; mensaje: string }
  | { fase: 'listo'; lugares: Lugar[] }

export default function App() {
  const campus = CAMPUS[CAMPUS_INICIAL]
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' })
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null)
  const [activas, setActivas] = useState<ReadonlySet<Categoria>>(new Set())
  const ubic = useUbicacion()

  // Cómo llegar: panel, origen, destino y ruta a pie.
  const [panelAbierto, setPanelAbierto] = useState(false)
  const [pestana, setPestana] = useState<Pestana>('llegar')
  const [origen, setOrigen] = useState<Origen>(null)
  const [destino, setDestino] = useState<PuntoRuta | null>(null)
  const origenCoords =
    origen === 'ubicacion'
      ? ubic.ubicacion
        ? ([ubic.ubicacion.lat, ubic.ubicacion.lng] as const)
        : null
      : (origen?.coordenadas ?? null)
  const estadoRuta = useRuta(
    origenCoords ? [...origenCoords] : null,
    destino?.coordenadas ?? null,
  )
  const rutaCalculada = estadoRuta.fase === 'listo' ? estadoRuta.ruta : null
  const [oLat, oLng] = origenCoords ?? [NaN, NaN]
  const [dLat, dLng] = destino?.coordenadas ?? [NaN, NaN]
  const rutaGeo = useMemo(
    () =>
      rutaCalculada ? rutaAGeoJSON(rutaCalculada, [oLat, oLng], [dLat, dLng]) : null,
    [rutaCalculada, oLat, oLng, dLat, dLng],
  )

  const lugares = useMemo(() => (estado.fase === 'listo' ? estado.lugares : []), [estado])
  const indice = useMemo(() => crearIndice(lugares), [lugares])
  const visibles = useMemo(
    () => filtrarPorCategorias(lugares, activas),
    [lugares, activas],
  )
  const seleccionado = lugares.find((l) => l.id === seleccionadoId) ?? null

  const conteo = useMemo(() => {
    const c = new Map<Categoria, number>()
    for (const l of lugares) c.set(l.categoria, (c.get(l.categoria) ?? 0) + 1)
    return c
  }, [lugares])

  // Elegir (o quitar) un lugar mantiene la URL compartible: /?lugar=id
  const elegir = useCallback((id: string | null) => {
    setSeleccionadoId(id)
    const { pathname, search, hash } = window.location
    window.history.replaceState(null, '', pathname + busquedaConLugar(search, id) + hash)
  }, [])

  useEffect(() => {
    cargarLugares(campus.id)
      .then((ls) => {
        setEstado({ fase: 'listo', lugares: ls })
        // Enlace compartido: abre el lugar si existe; si el id no existe, se ignora.
        const id = leerLugarDeUrl(window.location.search)
        if (id && ls.some((l) => l.id === id)) setSeleccionadoId(id)
      })
      .catch((e: unknown) =>
        setEstado({
          fase: 'error',
          mensaje: e instanceof Error ? e.message : 'Error desconocido',
        }),
      )
  }, [campus.id])

  function alternarCategoria(c: Categoria) {
    setActivas((previas) => {
      const nuevas = new Set(previas)
      if (!nuevas.delete(c)) nuevas.add(c)
      return nuevas
    })
  }

  function alElegirDeBuscador(l: Lugar) {
    // Si el filtro ocultaba ese lugar, se quita para que se vea en el mapa.
    if (activas.size > 0 && !activas.has(l.categoria)) setActivas(new Set())
    setPanelAbierto(false)
    elegir(l.id)
  }

  function alSeleccionarEnMapa(id: string | null) {
    if (id) setPanelAbierto(false)
    elegir(id)
  }

  function comoLlegarA(l: Lugar) {
    setDestino({ nombre: l.nombre, coordenadas: l.coordenadas })
    setPestana('ruta')
    setPanelAbierto(true)
    elegir(null)
  }

  function usarMiUbicacion() {
    setOrigen('ubicacion')
    ubic.solicitar()
  }

  function quitarRuta() {
    setOrigen(null)
    setDestino(null)
  }

  const fueraDelCampus =
    ubic.estado === 'listo' &&
    ubic.ubicacion !== null &&
    !dentroDeLimites(ubic.ubicacion.lat, ubic.ubicacion.lng, campus.limites, 0.02)
  const mensajeUbicacion = fueraDelCampus
    ? 'Parece que estás lejos del campus, así que no te mostramos en el mapa.'
    : MENSAJE_UBICACION[ubic.estado]

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-border bg-surface px-4 py-2">
        <div className="flex items-baseline gap-2">
          <h1 className="text-body font-bold text-primary">{APP_NAME}</h1>
          <span className="text-small text-muted">{campus.nombre}</span>
        </div>
        <Boton
          onClick={() => {
            setPestana(destino || origen ? 'ruta' : 'llegar')
            setPanelAbierto(true)
          }}
          aria-expanded={panelAbierto}
          className="min-h-touch"
        >
          Cómo llegar
        </Boton>
      </header>
      <NoticeBanner compacto />

      <div className="relative z-20 flex flex-col gap-2 border-b border-border bg-surface p-3">
        <div className="flex gap-2">
          <Buscador indice={indice} onElegir={alElegirDeBuscador} className="flex-1" />
          <Boton
            onClick={ubic.solicitar}
            disabled={ubic.estado === 'buscando'}
            aria-label="¿Dónde estoy?"
            title="¿Dónde estoy?"
            className="shrink-0"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
          </Boton>
        </div>

        {mensajeUbicacion && (
          <p role="status" className="text-small text-muted">
            {mensajeUbicacion}
          </p>
        )}

        <div
          role="group"
          aria-label="Filtrar por categoría"
          className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1"
        >
          {CATEGORIAS.filter((c) => conteo.has(c)).map((c) => (
            <ChipCategoria
              key={c}
              categoria={c}
              cantidad={conteo.get(c)}
              activo={activas.has(c)}
              onClick={() => alternarCategoria(c)}
            />
          ))}
          {activas.size > 0 && (
            <Boton onClick={() => setActivas(new Set())} className="shrink-0 text-small">
              Quitar filtros
            </Boton>
          )}
        </div>
      </div>

      <main className="relative flex-1">
        {estado.fase === 'error' ? (
          <p role="alert" className="p-4">
            No se pudieron cargar los lugares. {estado.mensaje}
          </p>
        ) : (
          <Mapa
            campus={campus}
            lugares={visibles}
            seleccionado={seleccionado}
            onSeleccionar={alSeleccionarEnMapa}
            ubicacion={ubic.ubicacion}
            ruta={rutaGeo}
          />
        )}
        {estado.fase === 'cargando' && (
          <p
            role="status"
            className="absolute left-4 top-4 rounded-control bg-surface px-3 py-2"
          >
            Cargando lugares…
          </p>
        )}
        {activas.size > 0 && (
          <p
            role="status"
            className="absolute bottom-3 left-3 rounded-pill bg-surface px-3 py-1 text-small shadow-sheet"
          >
            Mostrando {visibles.length} de {lugares.length} lugares
          </p>
        )}
        {rutaCalculada && !panelAbierto && !seleccionado && (
          <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-control border border-border bg-surface p-2 shadow-sheet">
            <span role="status" className="px-2 text-small">
              Ruta: {formatearDistancia(rutaCalculada.distanciaM)} ·{' '}
              {formatearDuracion(rutaCalculada.duracionS)}
            </span>
            <Boton onClick={quitarRuta} className="text-small">
              Quitar ruta
            </Boton>
          </div>
        )}
        {panelAbierto ? (
          <HojaInferior titulo="Cómo llegar" onCerrar={() => setPanelAbierto(false)}>
            <PanelRuta
              lugares={lugares}
              pestana={pestana}
              onPestana={setPestana}
              origen={origen}
              destino={destino}
              onOrigen={setOrigen}
              onDestino={setDestino}
              estado={estadoRuta}
              mensajeUbicacion={mensajeUbicacion}
              onUsarUbicacion={usarMiUbicacion}
              onVerLugar={(id) => {
                setPanelAbierto(false)
                elegir(id)
              }}
            />
          </HojaInferior>
        ) : (
          seleccionado && (
            <HojaInferior
              key={seleccionado.id}
              titulo={seleccionado.nombre}
              onCerrar={() => elegir(null)}
            >
              <DetalleLugar
                lugar={seleccionado}
                onComoLlegar={() => comoLlegarA(seleccionado)}
              />
            </HojaInferior>
          )
        )}
      </main>
    </div>
  )
}
