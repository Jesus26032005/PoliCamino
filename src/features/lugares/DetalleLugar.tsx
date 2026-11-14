import { Boton } from '../../components/Boton'
import { ChipCategoria } from '../../components/ChipCategoria'
import { URL_REPOSITORIO } from '../../lib/config'
import { enlaceSugerencia } from '../../lib/servicios'
import { CompartirLugar } from './CompartirLugar'
import { API_OCUPACION } from '../ocupacion/api'
import { OcupacionLugar } from '../ocupacion/OcupacionLugar'
import { admiteOcupacion } from '../../lib/ocupacion'
import { ServiciosLugar } from './ServiciosLugar'
import type { Lugar } from '../../lib/tipos'

function Dato({ etiqueta, valor }: { etiqueta: string; valor?: string }) {
  if (!valor) return null
  return (
    <div>
      <dt className="text-small text-muted">{etiqueta}</dt>
      <dd>{valor}</dd>
    </div>
  )
}

/** Contenido de la hoja: solo muestra datos que existen, y dice si están sin verificar. */
export function DetalleLugar({
  lugar,
  onComoLlegar,
}: {
  lugar: Lugar
  onComoLlegar: () => void
}) {
  const sugerencia = enlaceSugerencia(lugar, URL_REPOSITORIO)
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <ChipCategoria categoria={lugar.categoria} />
        <span
          className={`rounded-pill px-3 py-1 text-small ${
            lugar.verificado
              ? 'bg-primary text-on-primary'
              : 'bg-notice-bg text-notice-text'
          }`}
        >
          {lugar.verificado ? 'Verificado' : 'Sin verificar'}
        </span>
      </div>

      {lugar.alias && <p className="text-muted">También: {lugar.alias.join(', ')}</p>}

      <dl className="flex flex-col gap-2">
        <Dato etiqueta="Edificio" valor={lugar.edificio} />
        <Dato etiqueta="Descripción" valor={lugar.descripcion} />
        <Dato etiqueta="Horario" valor={lugar.horario} />
      </dl>

      <ServiciosLugar lugar={lugar} />

      {API_OCUPACION && admiteOcupacion(lugar.categoria) && (
        <OcupacionLugar lugarId={lugar.id} />
      )}

      {!lugar.verificado && (
        <p className="text-small text-muted">
          Ubicación tomada de OpenStreetMap; aún nadie la confirma en campo. Si algo está
          mal, corrígelo en OpenStreetMap o avisa.
        </p>
      )}
      {lugar.fuente && <p className="text-small text-muted">Fuente: {lugar.fuente}</p>}
      <div className="flex flex-wrap items-start gap-2">
        <Boton variante="primario" onClick={onComoLlegar}>
          Cómo llegar aquí
        </Boton>
        <CompartirLugar lugar={lugar} />
      </div>
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
    </>
  )
}
