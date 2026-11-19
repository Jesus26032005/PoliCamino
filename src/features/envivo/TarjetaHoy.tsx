import { useState, type ReactNode } from 'react'
import { Boton } from '../../components/Boton'
import {
  categoriaAqi,
  descripcionClima,
  distanciaKm,
  haceCuanto,
  horaDeIso,
  type Aire,
  type Clima,
  type Sismo,
} from '../../lib/envivo'
import type { LatLng } from '../../lib/tipos'
import type { EnVivo } from './useEnVivo'
import type { EstadoFuente } from './useFuente'

// Reloj de 24 h, igual que la hora del dato que da la fuente («14:00»).
const hora = (ms: number) =>
  new Date(ms).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

/** Número y unidad que nunca se separan al cambiar de línea (espacio no separable). */
const conUnidad = (n: number | string, unidad: string) => `${n}\u00a0${unidad}`

function Seccion<T>({
  titulo,
  estado,
  onReintentar,
  fuente,
  horaDato,
  children,
}: {
  titulo: string
  estado: EstadoFuente<T>
  onReintentar: () => void
  /** Quién da el dato (con enlace). */
  fuente: ReactNode
  /** Hora a la que corresponde el dato, según la propia fuente. */
  horaDato?: string
  children: (datos: T) => ReactNode
}) {
  return (
    <section
      aria-label={titulo}
      className="flex flex-col gap-2 rounded-card border border-border bg-soft p-4"
    >
      <h3 className="font-display font-semibold">{titulo}</h3>
      {estado.fase === 'cargando' && <p role="status">Cargando…</p>}
      {estado.fase === 'error' && (
        <div role="alert" className="flex flex-col items-start gap-2">
          <p className="rounded-control bg-notice-bg p-3 text-notice-text">
            No se pudo obtener este dato: {estado.mensaje}.
          </p>
          <Boton onClick={onReintentar} className="text-small">
            Reintentar
          </Boton>
        </div>
      )}
      {estado.fase === 'listo' && children(estado.datos)}
      <p className="text-small text-muted">
        Fuente: {fuente}
        {estado.fase === 'listo' && (
          <>
            {horaDato && <> · Dato de las {horaDato}</>} · Consultado a las{' '}
            {hora(estado.consultadoEn)}
          </>
        )}
      </p>
    </section>
  )
}

const Enlace = ({ href, children }: { href: string; children: ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-primary underline"
  >
    {children}
  </a>
)

function VistaClima({ c }: { c: Clima }) {
  return (
    <>
      <p className="font-display text-title font-bold leading-tight">
        {conUnidad(Math.round(c.temperaturaC), '°C')} · {descripcionClima(c.codigo)}
      </p>
      <p className="text-small text-muted">
        Sensación {conUnidad(Math.round(c.sensacionC), '°C')} · Humedad{' '}
        {conUnidad(Math.round(c.humedadPct), '%')} · Viento{' '}
        {conUnidad(Math.round(c.vientoKmh), 'km/h')} · Lluvia{' '}
        {conUnidad(c.precipitacionMm, 'mm')}
      </p>
    </>
  )
}

function VistaAire({ a }: { a: Aire }) {
  return (
    <>
      <p className="font-display text-title font-bold leading-tight">
        AQI {Math.round(a.usAqi)} · {categoriaAqi(a.usAqi)}
      </p>
      <p className="text-small text-muted">
        PM2.5 {conUnidad(a.pm25.toFixed(1), 'µg/m³')} · PM10{' '}
        {conUnidad(a.pm10.toFixed(1), 'µg/m³')} · Ozono{' '}
        {conUnidad(a.ozono.toFixed(0), 'µg/m³')}
      </p>
      <p className="text-small text-muted">
        Es una estimación de un modelo global (CAMS, celdas de ~45 km), no una medición de
        una estación del campus. Usa el índice AQI de EE. UU., que no es el IMECA de
        México.
      </p>
    </>
  )
}

function VistaSismos({ sismos, centro }: { sismos: Sismo[]; centro: LatLng }) {
  const [ahora] = useState(() => Date.now()) // se fija al mostrar la lista
  return (
    <>
      <p className="text-small text-muted">
        Últimos reportes del SSN para todo el país (no solo cerca del campus).
      </p>
      <ul className="flex flex-col divide-y divide-border">
        {sismos.slice(0, 5).map((s) => (
          <li key={`${s.instante}-${s.lat}-${s.lng}`} className="flex flex-col py-2">
            <span>
              <strong>M {s.magnitud.toFixed(1)}</strong> · {s.lugar}
            </span>
            <span className="text-small text-muted">
              {s.fechaTexto} (hora de México) · {haceCuanto(s.instante, ahora)} · a{' '}
              {Math.round(distanciaKm(centro, [s.lat, s.lng])).toLocaleString('es-MX')} km
              del campus
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}

/** Contenido de la hoja «Hoy en el campus»: clima, calidad del aire y sismos recientes. */
export function TarjetaHoy({ datos, centro }: { datos: EnVivo; centro: LatLng }) {
  const { clima, aire, sismos } = datos
  return (
    <>
      <Seccion
        titulo="Clima"
        estado={clima.estado}
        onReintentar={clima.recargar}
        fuente={<Enlace href="https://open-meteo.com/">Open-Meteo.com</Enlace>}
        horaDato={
          clima.estado.fase === 'listo' ? horaDeIso(clima.estado.datos.hora) : undefined
        }
      >
        {(c) => <VistaClima c={c} />}
      </Seccion>
      <Seccion
        titulo="Calidad del aire"
        estado={aire.estado}
        onReintentar={aire.recargar}
        fuente={
          <>
            <Enlace href="https://open-meteo.com/">Open-Meteo.com</Enlace> con datos del
            modelo CAMS (Copernicus)
          </>
        }
        horaDato={
          aire.estado.fase === 'listo' ? horaDeIso(aire.estado.datos.hora) : undefined
        }
      >
        {(a) => <VistaAire a={a} />}
      </Seccion>
      <Seccion
        titulo="Sismos recientes"
        estado={sismos.estado}
        onReintentar={sismos.recargar}
        fuente={
          <Enlace href="http://www.ssn.unam.mx/">
            Servicio Sismológico Nacional (UNAM)
          </Enlace>
        }
      >
        {(s) => <VistaSismos sismos={s} centro={centro} />}
      </Seccion>
      <div className="flex justify-start">
        <Boton
          onClick={() => {
            clima.recargar()
            aire.recargar()
            sismos.recargar()
          }}
        >
          Actualizar todo
        </Boton>
      </div>
    </>
  )
}
