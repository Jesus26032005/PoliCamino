import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Boton } from './components/Boton'
import { Buscador } from './components/Buscador'
import { ChipCategoria } from './components/ChipCategoria'
import { ChipFiltro } from './components/ChipFiltro'
import { HojaInferior } from './components/HojaInferior'
import { NoticeBanner } from './components/NoticeBanner'
import { CAMPUS, CAMPUS_INICIAL, CAMPUS_LISTA, esCampusId } from './data/campus'
import { SelectorCampus } from './components/SelectorCampus'
import { DetalleLugar } from './features/lugares/DetalleLugar'
import { TarjetaHoy } from './features/envivo/TarjetaHoy'
import { useEnVivo } from './features/envivo/useEnVivo'
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
import { busquedaCon, leerCampusDeUrl, leerLugarDeUrl } from './lib/enlaces'
import { dentroDeLimites } from './lib/geo'
import { cargarLimite, cargarLugares, type LimiteGeoJSON } from './lib/lugares'
import {
  esSilencioso,
  filtrarPorServicios,
  tieneEnchufes,
  type FiltroServicios,
} from './lib/servicios'
import { formatearDistancia, formatearDuracion, rutaAGeoJSON } from './lib/ruta'
import { descripcionClima } from './lib/envivo'
import { CATEGORIAS, type CampusId, type Categoria, type Lugar } from './lib/tipos'

type Carga =
  | { campusId: CampusId; fase: 'listo'; lugares: Lugar[]; limite: LimiteGeoJSON }
  | { campusId: CampusId; fase: 'error'; mensaje: string }

const SIN_LUGARES: Lugar[] = []

/** Reescribe campus y lugar en la URL (el campus por defecto no se escribe). */
function escribirUrl(campusId: CampusId, lugarId: string | null) {
  const { pathname, search, hash } = window.location
  const nueva = busquedaCon(search, {
    campus: campusId === CAMPUS_INICIAL ? null : campusId,
    lugar: lugarId,
  })
  window.history.replaceState(null, '', pathname + nueva + hash)
}

export default function App() {
  // Campus y lugar que pide la URL al abrir (enlaces compartidos).
  const [campusId, setCampusId] = useState<CampusId>(() => {
    const c = leerCampusDeUrl(window.location.search)
    return esCampusId(c) ? c : CAMPUS_INICIAL
  })
  const campusEnUrl = useRef(esCampusId(leerCampusDeUrl(window.location.search)))
  const lugarPendiente = useRef<string | null>(leerLugarDeUrl(window.location.search))
  const campus = CAMPUS[campusId]
  const [carga, setCarga] = useState<Carga | null>(null)
  // Si lo cargado es de otro campus, se considera "cargando" (sin parpadeos de datos ajenos).
  const actual = carga?.campusId === campusId ? carga : null
  const lugares = actual?.fase === 'listo' ? actual.lugares : SIN_LUGARES
  const limite = actual?.fase === 'listo' ? actual.limite : null
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null)
  const [activas, setActivas] = useState<ReadonlySet<Categoria>>(new Set())
  const [filtroServ, setFiltroServ] = useState<FiltroServicios>({
    enchufes: false,
    silencio: false,
  })
  const ubic = useUbicacion()
  const enVivo = useEnVivo(campus.centro)
  const [hoyAbierto, setHoyAbierto] = useState(false)

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

  const indice = useMemo(() => crearIndice(lugares), [lugares])
  const visibles = useMemo(
    () => filtrarPorServicios(filtrarPorCategorias(lugares, activas), filtroServ),
    [lugares, activas, filtroServ],
  )
  const hayFiltros = activas.size > 0 || filtroServ.enchufes || filtroServ.silencio
  const quitarFiltros = () => {
    setActivas(new Set())
    setFiltroServ({ enchufes: false, silencio: false })
  }
  const nEnchufes = useMemo(() => lugares.filter(tieneEnchufes).length, [lugares])
  const nSilencio = useMemo(() => lugares.filter(esSilencioso).length, [lugares])
  const seleccionado = lugares.find((l) => l.id === seleccionadoId) ?? null

  const conteo = useMemo(() => {
    const c = new Map<Categoria, number>()
    for (const l of lugares) c.set(l.categoria, (c.get(l.categoria) ?? 0) + 1)
    return c
  }, [lugares])

  // Elegir (o quitar) un lugar mantiene la URL compartible: /?campus=...&lugar=id
  const elegir = useCallback(
    (id: string | null) => {
      setSeleccionadoId(id)
      escribirUrl(campusId, id)
    },
    [campusId],
  )

  // Carga perezosa: solo se descargan los datos del campus que se está viendo.
  useEffect(() => {
    let vigente = true
    async function cargar() {
      try {
        const [ls, lim] = await Promise.all([
          cargarLugares(campusId),
          cargarLimite(campusId),
        ])
        if (!vigente) return
        setCarga({ campusId, fase: 'listo', lugares: ls, limite: lim })
        const pendiente = lugarPendiente.current
        if (!pendiente) return
        if (ls.some((l) => l.id === pendiente)) {
          lugarPendiente.current = null
          setSeleccionadoId(pendiente)
          return
        }
        // Enlace sin campus: el lugar puede ser de otro campus; se busca en los demás.
        if (!campusEnUrl.current) {
          for (const otro of CAMPUS_LISTA) {
            if (otro.id === campusId) continue
            const otros = await cargarLugares(otro.id)
            if (!vigente) return
            if (otros.some((l) => l.id === pendiente)) {
              campusEnUrl.current = true
              setCampusId(otro.id)
              escribirUrl(otro.id, pendiente)
              return
            }
          }
        }
        lugarPendiente.current = null // el id no existe: se ignora
      } catch (e) {
        if (vigente)
          setCarga({
            campusId,
            fase: 'error',
            mensaje: e instanceof Error ? e.message : 'Error desconocido',
          })
      }
    }
    void cargar()
    return () => {
      vigente = false
    }
  }, [campusId])

  function cambiarCampus(id: CampusId) {
    if (id === campusId) return
    lugarPendiente.current = null
    // Lo que pertenece al campus anterior (selección, filtros, ruta) no se arrastra.
    setCampusId(id)
    setSeleccionadoId(null)
    quitarFiltros()
    setOrigen(null)
    setDestino(null)
    setPanelAbierto(false)
    setHoyAbierto(false)
    escribirUrl(id, null)
  }

  function alternarCategoria(c: Categoria) {
    setActivas((previas) => {
      const nuevas = new Set(previas)
      if (!nuevas.delete(c)) nuevas.add(c)
      return nuevas
    })
  }

  function alElegirDeBuscador(l: Lugar) {
    // Si el filtro ocultaba ese lugar, se quita para que se vea en el mapa.
    if (hayFiltros && !visibles.some((v) => v.id === l.id)) quitarFiltros()
    setPanelAbierto(false)
    setHoyAbierto(false)
    elegir(l.id)
  }

  function alSeleccionarEnMapa(id: string | null) {
    if (id) {
      setPanelAbierto(false)
      setHoyAbierto(false)
    }
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
          <span className="hidden text-small text-muted sm:inline">{campus.nombre}</span>
        </div>
        <div className="flex items-center gap-2">
          <Boton
            onClick={() => {
              setPanelAbierto(false)
              setHoyAbierto((a) => !a)
            }}
            aria-expanded={hoyAbierto}
            aria-label={
              enVivo.clima.estado.fase === 'listo'
                ? `Hoy en el campus: ${Math.round(enVivo.clima.estado.datos.temperaturaC)} grados, ${descripcionClima(enVivo.clima.estado.datos.codigo)}`
                : 'Hoy en el campus'
            }
          >
            {enVivo.clima.estado.fase === 'listo'
              ? `Hoy ${Math.round(enVivo.clima.estado.datos.temperaturaC)}°`
              : 'Hoy'}
          </Boton>
          <Boton
            onClick={() => {
              setHoyAbierto(false)
              setPestana(destino || origen ? 'ruta' : 'llegar')
              setPanelAbierto(true)
            }}
            aria-expanded={panelAbierto}
          >
            Cómo llegar
          </Boton>
        </div>
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
          <SelectorCampus
            campus={campusId}
            opciones={CAMPUS_LISTA}
            onCambiar={cambiarCampus}
          />
          {CATEGORIAS.filter((c) => conteo.has(c)).map((c) => (
            <ChipCategoria
              key={c}
              categoria={c}
              cantidad={conteo.get(c)}
              activo={activas.has(c)}
              onClick={() => alternarCategoria(c)}
            />
          ))}
          {nEnchufes > 0 && (
            <ChipFiltro
              etiqueta="Con enchufes"
              cantidad={nEnchufes}
              activo={filtroServ.enchufes}
              onClick={() => setFiltroServ((f) => ({ ...f, enchufes: !f.enchufes }))}
            />
          )}
          {nSilencio > 0 && (
            <ChipFiltro
              etiqueta="Silencioso"
              cantidad={nSilencio}
              activo={filtroServ.silencio}
              onClick={() => setFiltroServ((f) => ({ ...f, silencio: !f.silencio }))}
            />
          )}
          {hayFiltros && (
            <Boton onClick={quitarFiltros} className="shrink-0 text-small">
              Quitar filtros
            </Boton>
          )}
        </div>
      </div>

      <main className="relative flex-1">
        {actual?.fase === 'error' ? (
          <p role="alert" className="p-4">
            No se pudieron cargar los lugares. {actual.mensaje}
          </p>
        ) : (
          <Mapa
            campus={campus}
            limite={limite}
            lugares={visibles}
            seleccionado={seleccionado}
            onSeleccionar={alSeleccionarEnMapa}
            ubicacion={ubic.ubicacion}
            ruta={rutaGeo}
          />
        )}
        {actual === null && (
          <p
            role="status"
            className="absolute left-4 top-4 rounded-control bg-surface px-3 py-2"
          >
            Cargando lugares…
          </p>
        )}
        {hayFiltros && (
          <p
            role="status"
            className="absolute bottom-3 left-3 rounded-pill bg-surface px-3 py-1 text-small shadow-sheet"
          >
            Mostrando {visibles.length} de {lugares.length} lugares
          </p>
        )}
        {rutaCalculada && !panelAbierto && !hoyAbierto && !seleccionado && (
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
        {hoyAbierto ? (
          <HojaInferior titulo="Hoy en el campus" onCerrar={() => setHoyAbierto(false)}>
            <TarjetaHoy datos={enVivo} centro={campus.centro} />
          </HojaInferior>
        ) : panelAbierto ? (
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
