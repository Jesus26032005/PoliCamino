import { Boton } from '../../components/Boton'
import { ChipCategoria } from '../../components/ChipCategoria'
import { Icono } from '../../components/Icono'
import { URL_REPOSITORIO } from '../../lib/config'
import { admiteOcupacion } from '../../lib/ocupacion'
import { enlaceSugerencia } from '../../lib/servicios'
import type { Lugar } from '../../lib/tipos'
import { API_OCUPACION } from '../ocupacion/api'
import { OcupacionLugar } from '../ocupacion/OcupacionLugar'
import { CompartirLugar } from './CompartirLugar'
import { ServiciosLugar } from './ServiciosLugar'

function Dato({ etiqueta, valor }: { etiqueta: string; valor?: string }) {
  if (!valor) return null
  return (
    <div>
      <dt className="text-small text-muted">{etiqueta}</dt>
      <dd>{valor}</dd>
    </div>
  )
}

type Props = {
  lugar: Lugar
  onComoLlegar: () => void
  /** Vuelve a la lista de lugares del campus. */
  onVolver: () => void
}

/** Ficha de un lugar: solo muestra datos que existen, y dice si están sin verificar. */
export function DetalleLugar({ lugar, onComoLlegar, onVolver }: Props) {
  const sugerencia = enlaceSugerencia(lugar, URL_REPOSITORIO)
  return (
    <>
      <Boton
        variante="relleno"
        onClick={onVolver}
        className="self-start pl-2.5 text-small"
      >
        <Icono nombre="atras" tam={18} />
        Lugares
      </Boton>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <ChipCategoria categoria={lugar.categoria} />
          <span
            className={`rounded-pill px-3 py-1 text-small font-semibold ${
              lugar.verificado
                ? 'bg-primary text-on-primary'
                : 'bg-notice-bg text-notice-text'
            }`}
          >
            {lugar.verificado ? 'Verificado' : 'Sin verificar'}
          </span>
        </div>
        <h2
          id="panel-titulo"
          tabIndex={-1}
          className="font-display text-title font-bold leading-tight tracking-tight outline-none"
        >
          {lugar.nombre}
        </h2>
        {lugar.alias && (
          <p className="text-small text-muted">También: {lugar.alias.join(', ')}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Boton variante="primario" onClick={onComoLlegar} className="min-h-control">
          <Icono nombre="ruta" tam={20} />
          Cómo llegar aquí
        </Boton>
        <CompartirLugar lugar={lugar} />
      </div>

      {API_OCUPACION && admiteOcupacion(lugar.categoria) && (
        <OcupacionLugar lugarId={lugar.id} />
      )}

      <ServiciosLugar lugar={lugar} />

      <dl className="flex flex-col gap-2">
        <Dato etiqueta="Edificio" valor={lugar.edificio} />
        <Dato etiqueta="Descripción" valor={lugar.descripcion} />
        <Dato etiqueta="Horario" valor={lugar.horario} />
      </dl>

      {sugerencia && (
        <p className="text-small">
          ¿Sabes si hay enchufes o si es silencioso?{' '}
          <a
            href={sugerencia}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            Sugerir datos
          </a>
        </p>
      )}

      <p className="text-mini leading-relaxed text-muted">
        {!lugar.verificado &&
          'Ubicación tomada de OpenStreetMap; aún nadie la confirma en campo. Si algo está mal, corrígelo en OpenStreetMap o avisa. '}
        {lugar.fuente && `Fuente: ${lugar.fuente}`}
      </p>
    </>
  )
}
