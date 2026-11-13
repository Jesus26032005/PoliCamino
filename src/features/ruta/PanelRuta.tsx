import { useMemo, useState } from 'react'
import { Boton } from '../../components/Boton'
import { Buscador } from '../../components/Buscador'
import { crearIndice } from '../../lib/busqueda'
import { formatearDistancia, formatearDuracion } from '../../lib/ruta'
import type { LatLng, Lugar } from '../../lib/tipos'
import type { EstadoRuta } from './useRuta'

export type PuntoRuta = { nombre: string; coordenadas: LatLng }
export type Origen = PuntoRuta | 'ubicacion' | null
export type Pestana = 'llegar' | 'ruta'

type Props = {
  lugares: Lugar[]
  pestana: Pestana
  onPestana: (p: Pestana) => void
  origen: Origen
  destino: PuntoRuta | null
  onOrigen: (o: Origen) => void
  onDestino: (d: PuntoRuta | null) => void
  estado: EstadoRuta
  /** Mensaje sobre la ubicación (permiso, búsqueda…); vacío si no hay. */
  mensajeUbicacion: string
  onUsarUbicacion: () => void
  onVerLugar: (id: string) => void
}

const aPunto = (l: Lugar): PuntoRuta => ({ nombre: l.nombre, coordenadas: l.coordenadas })

function Pestanas({ pestana, onPestana }: Pick<Props, 'pestana' | 'onPestana'>) {
  const opciones: [Pestana, string][] = [
    ['llegar', 'Llegar al campus'],
    ['ruta', 'Ruta a pie'],
  ]
  return (
    <div role="tablist" aria-label="Cómo llegar" className="flex gap-2">
      {opciones.map(([id, texto]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={pestana === id}
          onClick={() => onPestana(id)}
          className={`min-h-touch flex-1 rounded-control border px-3 font-medium ${
            pestana === id
              ? 'border-primary bg-primary text-on-primary'
              : 'border-border bg-surface text-text'
          }`}
        >
          {texto}
        </button>
      ))}
    </div>
  )
}

function Grupo({
  titulo,
  items,
  abierto = false,
  onVer,
  onDesdeAqui,
}: {
  titulo: string
  items: Lugar[]
  abierto?: boolean
  onVer: (id: string) => void
  onDesdeAqui: (l: Lugar) => void
}) {
  if (items.length === 0) return null
  return (
    <details open={abierto} className="rounded-control border border-border">
      <summary className="min-h-touch cursor-pointer px-4 py-3 font-medium">
        {titulo} <span className="text-muted">({items.length})</span>
      </summary>
      <ul className="divide-y divide-border border-t border-border">
        {items.map((l) => (
          <li key={l.id} className="flex flex-col gap-1 px-4 py-3">
            <span className="font-medium">{l.nombre}</span>
            {l.descripcion && (
              <span className="text-small text-muted">{l.descripcion}</span>
            )}
            <span className="text-small text-muted">
              {l.verificado ? 'Verificado' : 'Sin verificar'} · {l.fuente}
            </span>
            <div className="mt-1 flex flex-wrap gap-2">
              <Boton onClick={() => onVer(l.id)} className="text-small">
                Ver en el mapa
              </Boton>
              <Boton onClick={() => onDesdeAqui(l)} className="text-small">
                Ruta desde aquí
              </Boton>
            </div>
          </li>
        ))}
      </ul>
    </details>
  )
}

function ResultadoRuta({ estado }: { estado: EstadoRuta }) {
  if (estado.fase === 'inactivo')
    return <p className="text-muted">Elige un origen y un destino para ver la ruta.</p>
  if (estado.fase === 'cargando') return <p role="status">Calculando ruta…</p>
  if (estado.fase === 'error')
    return (
      <p role="alert" className="rounded-control bg-notice-bg p-3 text-notice-text">
        {estado.mensaje}. Revisa tu conexión e intenta de nuevo.
      </p>
    )
  return (
    <div role="status" className="flex flex-col gap-1">
      <p className="text-title font-bold">
        {formatearDistancia(estado.ruta.distanciaM)} ·{' '}
        {formatearDuracion(estado.ruta.duracionS)} a pie
      </p>
      <p className="text-small text-muted">
        Tiempo aproximado a paso normal; no considera tráfico, pendientes ni puertas
        cerradas. La ruta sigue los caminos que OpenStreetMap tiene registrados.
      </p>
    </div>
  )
}

/** Contenido de la hoja "Cómo llegar": accesos al campus y ruta a pie entre dos puntos. */
export function PanelRuta(p: Props) {
  const indice = useMemo(() => crearIndice(p.lugares), [p.lugares])
  const [giros, setGiros] = useState(0) // cambia la key de los buscadores al invertir

  const grupos = useMemo(() => {
    const t = p.lugares.filter((l) => l.categoria === 'transporte')
    return {
      metro: t.filter((l) => l.nombre.startsWith('Metro ')),
      estaciones: t.filter(
        (l) => !l.nombre.startsWith('Metro ') && !l.nombre.startsWith('Parada '),
      ),
      paradas: t.filter((l) => l.nombre.startsWith('Parada ')),
      accesos: p.lugares.filter((l) => l.categoria === 'acceso'),
    }
  }, [p.lugares])

  const desdeAqui = (l: Lugar) => {
    p.onOrigen(aPunto(l))
    setGiros((g) => g + 1)
    p.onPestana('ruta')
  }

  const puedeInvertir =
    p.origen !== null && p.origen !== 'ubicacion' && p.destino !== null
  const invertir = () => {
    if (!puedeInvertir) return
    const o = p.origen as PuntoRuta
    p.onOrigen(p.destino)
    p.onDestino(o)
    setGiros((g) => g + 1)
  }

  const textoOrigen = p.origen === 'ubicacion' ? 'Mi ubicación' : (p.origen?.nombre ?? '')

  return (
    <>
      <Pestanas pestana={p.pestana} onPestana={p.onPestana} />

      {p.pestana === 'llegar' ? (
        <div role="tabpanel" className="flex flex-col gap-3">
          <p className="text-small text-muted">
            Datos de OpenStreetMap (© colaboradores, ODbL). Todos están sin verificar en
            campo. Aún no incluimos líneas del Metro ni rutas de trolebús: OSM no las trae
            para estos puntos y no las inventamos.
          </p>
          <Grupo
            titulo="Metro"
            items={grupos.metro}
            abierto
            onVer={p.onVerLugar}
            onDesdeAqui={desdeAqui}
          />
          <Grupo
            titulo="Estaciones de autobuses"
            items={grupos.estaciones}
            onVer={p.onVerLugar}
            onDesdeAqui={desdeAqui}
          />
          <Grupo
            titulo="Accesos (puertas en OSM)"
            items={grupos.accesos}
            onVer={p.onVerLugar}
            onDesdeAqui={desdeAqui}
          />
          <Grupo
            titulo="Paradas de camión cercanas"
            items={grupos.paradas}
            onVer={p.onVerLugar}
            onDesdeAqui={desdeAqui}
          />
        </div>
      ) : (
        <div role="tabpanel" className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <p className="text-small text-muted">Origen</p>
            <Buscador
              key={`o-${giros}-${textoOrigen}`}
              indice={indice}
              enLinea
              etiqueta="Origen de la ruta"
              placeholder="¿Desde dónde sales?"
              valorInicial={textoOrigen}
              onElegir={(l) => p.onOrigen(aPunto(l))}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Boton onClick={p.onUsarUbicacion} className="text-small">
                Usar mi ubicación
              </Boton>
              <Boton onClick={invertir} disabled={!puedeInvertir} className="text-small">
                ⇅ Invertir
              </Boton>
            </div>
            {p.mensajeUbicacion && (
              <p role="status" className="text-small text-muted">
                {p.mensajeUbicacion}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-small text-muted">Destino</p>
            <Buscador
              key={`d-${giros}-${p.destino?.nombre ?? ''}`}
              indice={indice}
              enLinea
              etiqueta="Destino de la ruta"
              placeholder="¿A dónde vas?"
              valorInicial={p.destino?.nombre ?? ''}
              onElegir={(l) => p.onDestino(aPunto(l))}
            />
          </div>

          <ResultadoRuta estado={p.estado} />

          <p className="text-small text-muted">
            Ruta calculada con OSRM (servidor de FOSSGIS) sobre datos de OpenStreetMap. Al
            calcularla, las coordenadas de origen y destino se envían a ese servidor.{' '}
            <a
              href="https://www.openstreetmap.org/fixthemap"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Corregir el mapa
            </a>
            .
          </p>
        </div>
      )}
    </>
  )
}
