import { useState } from 'react'
import { Boton } from '../../components/Boton'
import { useFuente } from '../envivo/useFuente'
import { ErrorEnVivo, haceCuanto } from '../../lib/envivo'
import { ETIQUETA_NIVEL, NIVELES, VENTANA_MS, type Nivel } from '../../lib/ocupacion'
import { cargarOcupacion, enviarReporte, minutosDeEspera } from './api'

type Envio =
  | { fase: 'libre' }
  | { fase: 'enviando' }
  | { fase: 'enviado' }
  | { fase: 'error'; mensaje: string }

/** Ocupación según estudiantes + botones para reportar. Solo para cafeterías y bibliotecas. */
export function OcupacionLugar({ lugarId }: { lugarId: string }) {
  const { estado, recargar } = useFuente(cargarOcupacion)
  const [envio, setEnvio] = useState<Envio>({ fase: 'libre' })
  const [ahora] = useState(() => Date.now())
  const espera = minutosDeEspera(lugarId, ahora)

  async function reportar(nivel: Nivel) {
    setEnvio({ fase: 'enviando' })
    try {
      await enviarReporte(lugarId, nivel)
      setEnvio({ fase: 'enviado' })
      recargar()
    } catch (e) {
      setEnvio({
        fase: 'error',
        mensaje: e instanceof ErrorEnVivo ? e.message : 'No se pudo enviar',
      })
    }
  }

  const dato = estado.fase === 'listo' ? estado.datos.lugares[lugarId] : undefined

  return (
    <section
      aria-label="Ocupación según estudiantes"
      className="flex flex-col gap-2 rounded-control border border-border p-3"
    >
      <h3 className="font-semibold">Ocupación según estudiantes</h3>

      {estado.fase === 'cargando' && <p role="status">Cargando…</p>}
      {estado.fase === 'error' && (
        <p role="alert" className="text-small text-muted">
          No se pudo consultar la ocupación: {estado.mensaje}.
        </p>
      )}
      {estado.fase === 'listo' &&
        (dato ? (
          <p role="status">
            <strong>{ETIQUETA_NIVEL[dato.nivel]}</strong>{' '}
            <span className="text-small text-muted">
              · {dato.reportes} reportes · el último{' '}
              {haceCuanto(dato.ultimo, estado.datos.generado)}
            </span>
          </p>
        ) : (
          <p role="status" className="text-muted">
            Sin datos recientes. Se necesitan al menos 3 reportes de personas distintas en
            los últimos {VENTANA_MS / 60_000} min.
          </p>
        ))}

      <fieldset
        className="flex flex-col gap-2"
        disabled={espera > 0 || envio.fase === 'enviando' || envio.fase === 'enviado'}
      >
        <legend className="text-small text-muted">
          ¿Cómo está ahora? Reporta en un toque
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {NIVELES.map((n) => (
            <Boton key={n} onClick={() => reportar(n)} className="text-small">
              {ETIQUETA_NIVEL[n]}
            </Boton>
          ))}
        </div>
      </fieldset>

      <div role="status" className="text-small">
        {envio.fase === 'enviando' && 'Enviando…'}
        {envio.fase === 'enviado' && 'Gracias: tu reporte ayuda a otras personas.'}
        {envio.fase === 'error' && (
          <span className="text-notice-text">{envio.mensaje}</span>
        )}
        {envio.fase === 'libre' &&
          espera > 0 &&
          `Ya reportaste este lugar. Puedes volver a hacerlo en ${espera} min.`}
      </div>

      <p className="text-small text-muted">
        Reporte anónimo: no pedimos nombre ni ubicación. Guardamos un identificador
        aleatorio de tu dispositivo y una huella de tu red (no la IP) hasta 24 h, solo
        para frenar abusos. Es una referencia de la comunidad, no una medición oficial.
      </p>
    </section>
  )
}
