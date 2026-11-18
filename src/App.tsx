import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Boton } from './components/Boton'
import { Buscador } from './components/Buscador'
import { ChipFiltro } from './components/ChipFiltro'
import { Cifra } from './components/Cifra'
import { FiltroCategorias } from './components/FiltroCategorias'
import { Icono } from './components/Icono'
import { NoticeBanner } from './components/NoticeBanner'
import { Panel, type EstadoHoja } from './components/Panel'
import { SelectorCampus } from './components/SelectorCampus'
import { CAMPUS, CAMPUS_INICIAL, CAMPUS_LISTA, esCampusId } from './data/campus'
import { TarjetaHoy } from './features/envivo/TarjetaHoy'
import { useEnVivo } from './features/envivo/useEnVivo'
import { AvisosPWA } from './features/pwa/AvisosPWA'
import { DetalleLugar } from './features/lugares/DetalleLugar'
import type { Relleno } from './features/mapa/Mapa'
import {
  PanelRuta,
  type Origen,
  type Pestana as PestanaRuta,
  type PuntoRuta,
} from './features/ruta/PanelRuta'
import { useRuta } from './features/ruta/useRuta'
import { MENSAJE_UBICACION, useUbicacion } from './features/ubicacion/useUbicacion'
import { crearIndice, ocultarCategorias } from './lib/busqueda'
import { APP_NAME, DISCLAIMER_TEXT } from './lib/config'
import { busquedaCon, leerCampusDeUrl, leerLugarDeUrl } from './lib/enlaces'
import { categoriaAqi, descripcionClima } from './lib/envivo'
import { dentroDeLimites } from './lib/geo'
import { cargarLimite, cargarLugares, type LimiteGeoJSON } from './lib/lugares'
import { esEscritorioAhora, useEsEscritorio } from './lib/pantalla'
import { formatearDistancia, formatearDuracion, rutaAGeoJSON } from './lib/ruta'
import {
  esSilencioso,
  filtrarPorServicios,
  tieneEnchufes,
  type FiltroServicios,
} from './lib/servicios'
import type { CampusId, Categoria, Lugar } from './lib/tipos'

type Carga =
  | { campusId: CampusId; fase: 'listo'; lugares: Lugar[]; limite: LimiteGeoJSON }
  | { campusId: CampusId; fase: 'error'; mensaje: string }

const SIN_LUGARES: Lugar[] = []

// MapLibre pesa ~1 MB: se carga aparte para que la interfaz se pinte antes que el mapa.
const Mapa = lazy(() => import('./features/mapa/Mapa').then((m) => ({ default: m.Mapa })))

const PESTANAS = [
  { id: 'lugares', etiqueta: 'Lugares' },
  { id: 'llegar', etiqueta: 'Cómo llegar' },
  { id: 'hoy', etiqueta: 'Hoy' },
] as const
type PestanaPanel = (typeof PESTANAS)[number]['id']

/** Reescribe campus y lugar en la URL (el campus por defecto no se escribe). */
function escribirUrl(campusId: CampusId, lugarId: string | null) {
  const { pathname, search, hash } = window.location
  const nueva = busquedaCon(search, {
    campus: campusId === CAMPUS_INICIAL ? null : campusId,
    lugar: lugarId,
  })
  window.history.replaceState(null, '', pathname + nueva + hash)
}

/**
 * Píxeles del mapa que tapan la barra superior y el panel, según el tamaño de pantalla.
 * Deben acompañar a los tamaños de `.panel` en index.css.
 */
function rellenoDelMapa(hoja: EstadoHoja): Relleno {
  if (esEscritorioAhora()) return { top: 88, right: 16, bottom: 16, left: 430 }
  return {
    top: 116,
    right: 12,
    left: 12,
    bottom: hoja === 'min' ? 96 : Math.round(window.innerHeight * 0.46),
  }
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
  // Categorías que la persona apagó (vacío = se ve todo).
  const [apagadas, setApagadas] = useState<ReadonlySet<Categoria>>(new Set())
  const [filtroServ, setFiltroServ] = useState<FiltroServicios>({
    enchufes: false,
    silencio: false,
  })
  const ubic = useUbicacion()
  const enVivo = useEnVivo(campus.centro)
  const escritorio = useEsEscritorio()

  // Panel: pestaña activa y altura de la hoja inferior (solo móvil).
  const [pestana, setPestana] = useState<PestanaPanel>('lugares')
  const [hoja, setHoja] = useState<EstadoHoja>('medio')
  const hojaRef = useRef(hoja)
  useEffect(() => {
    hojaRef.current = hoja
  })
  const obtenerRelleno = useCallback(() => rellenoDelMapa(hojaRef.current), [])

  // Cómo llegar: origen, destino y ruta a pie.
  const [pestanaRuta, setPestanaRuta] = useState<PestanaRuta>('llegar')
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
    () => filtrarPorServicios(ocultarCategorias(lugares, apagadas), filtroServ),
    [lugares, apagadas, filtroServ],
  )
  const hayFiltros = apagadas.size > 0 || filtroServ.enchufes || filtroServ.silencio
  const quitarFiltros = () => {
    setApagadas(new Set())
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
    setPestana('lugares')
    escribirUrl(id, null)
  }

  function alternarCategoria(c: Categoria) {
    setApagadas((previas) => {
      const nuevas = new Set(previas)
      if (!nuevas.delete(c)) nuevas.add(c)
      return nuevas
    })
  }

  /** Muestra la ficha de un lugar: pestaña Lugares y, en móvil, hoja a media altura. */
  function mostrarLugar(id: string) {
    setPestana('lugares')
    setHoja('medio')
    elegir(id)
  }

  function cambiarPestana(p: PestanaPanel) {
    setPestana(p)
    setHoja((h) => (h === 'min' ? 'medio' : h))
  }

  function alElegirDeBuscador(l: Lugar) {
    // Si el filtro ocultaba ese lugar, se quita para que se vea en el mapa.
    if (hayFiltros && !visibles.some((v) => v.id === l.id)) quitarFiltros()
    mostrarLugar(l.id)
  }

  function alSeleccionarEnMapa(id: string | null) {
    if (id) mostrarLugar(id)
    else elegir(null)
  }

  function comoLlegarA(l: Lugar) {
    setDestino({ nombre: l.nombre, coordenadas: l.coordenadas })
    setPestanaRuta('ruta')
    setPestana('llegar')
    setHoja('medio')
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

  // Al abrir una ficha, el foco pasa a su título (lectores de pantalla y teclado).
  useEffect(() => {
    if (seleccionadoId)
      document.getElementById('panel-titulo')?.focus({ preventScroll: true })
  }, [seleccionadoId])

  // Escape cierra la ficha abierta.
  useEffect(() => {
    if (!seleccionadoId) return
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && elegir(null)
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [seleccionadoId, elegir])

  const conteoDe = (c: Categoria) => conteo.get(c) ?? 0
  // Solo estaciones del Metro (hay paraderos de autobús que también se llaman "Metro …").
  const nMetro = useMemo(
    () => lugares.filter((l) => l.descripcion?.startsWith('Estación del Metro')).length,
    [lugares],
  )
  // Accesos rápidos de la barra (escritorio): escuelas con siglas de uso común.
  const atajos = useMemo(
    () => lugares.filter((l) => l.categoria === 'escuela' && l.alias?.length).slice(0, 6),
    [lugares],
  )
  const clima = enVivo.clima.estado.fase === 'listo' ? enVivo.clima.estado.datos : null
  const aire = enVivo.aire.estado.fase === 'listo' ? enVivo.aire.estado.datos : null

  const buscador = (
    <Buscador
      key={campusId}
      indice={indice}
      onElegir={alElegirDeBuscador}
      enLinea={escritorio}
      flotante={!escritorio}
      placeholder={escritorio ? undefined : 'Buscar lugar…'}
      className={escritorio ? '' : 'min-w-0 flex-1'}
    />
  )

  return (
    <div className="app relative h-full overflow-hidden" data-hoja={hoja}>
      <main className="absolute inset-0">
        <Suspense
          fallback={
            <p role="status" className="sr-only">
              Cargando mapa…
            </p>
          }
        >
          <Mapa
            campus={campus}
            limite={limite}
            lugares={visibles}
            seleccionado={seleccionado}
            onSeleccionar={alSeleccionarEnMapa}
            ubicacion={ubic.ubicacion}
            ruta={rutaGeo}
            obtenerRelleno={obtenerRelleno}
          />
        </Suspense>
      </main>

      {/* Barra superior flotante */}
      <header className="pointer-events-none absolute inset-x-3 top-3 z-30 flex flex-wrap items-center gap-2 *:pointer-events-auto desk:inset-x-3.5 desk:top-3.5 desk:gap-2.5">
        <div className="flotante flex h-control items-center gap-2.5 rounded-card p-2 desk:pr-4">
          <span className="flex size-9 items-center justify-center rounded-control bg-primary text-on-primary">
            <Icono nombre="ruta" tam={20} />
          </span>
          <h1 className="sr-only font-display text-body font-bold tracking-tight desk:not-sr-only">
            {APP_NAME}
          </h1>
        </div>

        {escritorio ? (
          <>
            <SelectorCampus
              campus={campusId}
              opciones={CAMPUS_LISTA}
              onCambiar={cambiarCampus}
              className="flotante"
            />
            <nav aria-label="Ir a" className="flex min-w-0 flex-1 gap-2 overflow-hidden">
              {atajos.map((l) => (
                <Boton
                  key={l.id}
                  variante="flotante"
                  onClick={() => mostrarLugar(l.id)}
                  title={l.nombre}
                  className="shrink-0 rounded-pill text-small"
                >
                  {l.alias![0]}
                </Boton>
              ))}
            </nav>
          </>
        ) : (
          buscador
        )}

        <div className="order-last flex basis-full desk:order-none desk:basis-auto">
          <NoticeBanner />
        </div>

        <Boton
          variante="flotante"
          onClick={() => {
            setPestana('hoy')
            setHoja('max')
          }}
          className="h-control shrink-0 rounded-card px-3 desk:px-4"
        >
          <span className="hidden desk:inline-flex">
            <Icono nombre="nube" tam={20} />
          </span>
          {/* El nombre accesible incluye el texto visible (control por voz: «pulsa 15°»). */}
          <span className="sr-only">Hoy en el campus:</span>
          <span className="font-display text-body font-semibold">
            {clima ? `${Math.round(clima.temperaturaC)}°` : 'Hoy'}
          </span>
          {clima && <span className="sr-only">, {descripcionClima(clima.codigo)}</span>}
          {aire && (
            <span
              title={`Calidad del aire: ${categoriaAqi(aire.usAqi)}`}
              className="hidden rounded-pill bg-notice-bg px-2 py-0.5 text-mini font-semibold text-notice-text desk:inline"
            >
              AQI {Math.round(aire.usAqi)}
            </span>
          )}
        </Boton>
        <Boton
          variante="primario"
          onClick={ubic.solicitar}
          disabled={ubic.estado === 'buscando'}
          aria-label="¿Dónde estoy?"
          title="¿Dónde estoy?"
          className="size-control shrink-0 rounded-card px-0 shadow-flotante"
        >
          <Icono nombre="ubicacion" />
        </Boton>
      </header>

      {/* Avisos y resumen de ruta, sobre el mapa */}
      <div className="bajo-barra pointer-events-none flex flex-col items-start gap-2 *:pointer-events-auto">
        <AvisosPWA />
        {rutaCalculada && (
          <div className="flex h-control items-center gap-3 rounded-card bg-ink pl-4 pr-1.5 text-on-ink shadow-flotante">
            <span role="status" className="flex items-baseline gap-2">
              <span className="font-display text-title font-bold leading-none">
                {formatearDuracion(rutaCalculada.duracionS)}
              </span>
              <span className="text-small">
                {formatearDistancia(rutaCalculada.distanciaM)} a pie
              </span>
            </span>
            <button
              type="button"
              onClick={quitarRuta}
              className="min-h-touch rounded-control border border-current px-3 text-small font-semibold"
            >
              Quitar ruta
            </button>
          </div>
        )}
        {actual === null && (
          <p role="status" className="flotante rounded-control px-3 py-2 text-small">
            Cargando lugares…
          </p>
        )}
        {actual?.fase === 'error' && (
          <p
            role="alert"
            className="rounded-control bg-notice-bg px-3 py-2 text-small text-notice-text"
          >
            No se pudieron cargar los lugares. {actual.mensaje}
          </p>
        )}
        {mensajeUbicacion && pestana !== 'llegar' && (
          <p role="status" className="flotante rounded-control px-3 py-2 text-small">
            {mensajeUbicacion}
          </p>
        )}
      </div>

      <Panel
        pestanas={PESTANAS}
        activa={pestana}
        onPestana={cambiarPestana}
        estado={hoja}
        onEstado={setHoja}
      >
        {pestana === 'lugares' &&
          (seleccionado ? (
            <DetalleLugar
              key={seleccionado.id}
              lugar={seleccionado}
              onComoLlegar={() => comoLlegarA(seleccionado)}
              onVolver={() => elegir(null)}
            />
          ) : (
            <>
              <div className="flex flex-col gap-3">
                <div>
                  <h2 className="font-display text-display font-bold leading-tight tracking-tight">
                    {campus.nombre}
                  </h2>
                  <p className="text-small text-muted">{campus.nombreLargo}</p>
                </div>
                {!escritorio && (
                  <SelectorCampus
                    campus={campusId}
                    opciones={CAMPUS_LISTA}
                    onCambiar={cambiarCampus}
                    className="self-start bg-soft"
                  />
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Cifra valor={lugares.length} texto="lugares en el mapa" />
                <Cifra valor={nMetro} texto="estaciones de Metro cerca" />
                <Cifra valor={conteoDe('acceso')} texto="accesos mapeados" />
              </div>

              {escritorio && buscador}

              <div className="flex flex-col gap-2">
                <p className="rotulo">Categorías · enciende las que quieras ver</p>
                <FiltroCategorias
                  conteo={conteo}
                  apagadas={apagadas}
                  onAlternar={alternarCategoria}
                />
              </div>

              {(nEnchufes > 0 || nSilencio > 0) && (
                <div className="flex flex-wrap gap-2">
                  {nEnchufes > 0 && (
                    <ChipFiltro
                      etiqueta="Con enchufes"
                      cantidad={nEnchufes}
                      activo={filtroServ.enchufes}
                      onClick={() =>
                        setFiltroServ((f) => ({ ...f, enchufes: !f.enchufes }))
                      }
                    />
                  )}
                  {nSilencio > 0 && (
                    <ChipFiltro
                      etiqueta="Silencioso"
                      cantidad={nSilencio}
                      activo={filtroServ.silencio}
                      onClick={() =>
                        setFiltroServ((f) => ({ ...f, silencio: !f.silencio }))
                      }
                    />
                  )}
                </div>
              )}

              {hayFiltros && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p role="status" className="text-small text-muted">
                    Mostrando {visibles.length} de {lugares.length} lugares
                  </p>
                  <Boton onClick={quitarFiltros} className="text-small">
                    Mostrar todo
                  </Boton>
                </div>
              )}

              <p className="mt-auto border-t border-border pt-3 text-mini leading-relaxed text-muted">
                {DISCLAIMER_TEXT} Lugares tomados de OpenStreetMap, sin verificar en
                campo.
              </p>
            </>
          ))}

        {pestana === 'llegar' && (
          <PanelRuta
            lugares={lugares}
            pestana={pestanaRuta}
            onPestana={setPestanaRuta}
            origen={origen}
            destino={destino}
            onOrigen={setOrigen}
            onDestino={setDestino}
            estado={estadoRuta}
            mensajeUbicacion={mensajeUbicacion}
            onUsarUbicacion={usarMiUbicacion}
            onVerLugar={mostrarLugar}
          />
        )}

        {pestana === 'hoy' && (
          <>
            <div>
              <h2 className="font-display text-title font-bold leading-tight tracking-tight">
                Hoy en {campus.nombre}
              </h2>
              <p className="text-small text-muted">
                Clima, calidad del aire y sismos recientes
              </p>
            </div>
            <TarjetaHoy datos={enVivo} centro={campus.centro} />
          </>
        )}
      </Panel>
    </div>
  )
}
