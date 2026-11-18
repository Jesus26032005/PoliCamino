import { useRegisterSW } from 'virtual:pwa-register/react'
import { useEnLinea } from './useEnLinea'

/**
 * Avisos de la app instalable: sin conexión y versión nueva disponible.
 * La actualización la decide la persona: recargar sola a media caminata sería molesto.
 */
export function AvisosPWA() {
  const enLinea = useEnLinea()
  const {
    needRefresh: [hayVersionNueva, setHayVersionNueva],
    updateServiceWorker,
  } = useRegisterSW()

  return (
    <>
      {!enLinea && (
        <p
          role="status"
          className="rounded-control bg-ink px-3 py-2 text-small font-medium text-on-ink shadow-flotante"
        >
          Sin conexión: ves el mapa y los lugares guardados. Rutas y datos en vivo vuelven
          al reconectar.
        </p>
      )}
      {hayVersionNueva && (
        <div
          role="status"
          className="flotante flex flex-wrap items-center gap-2 rounded-card py-1.5 pl-3 pr-1.5 text-small"
        >
          <span>Hay una versión nueva de la app.</span>
          <button
            type="button"
            onClick={() => void updateServiceWorker(true)}
            className="min-h-touch rounded-control bg-primary px-3 font-semibold text-on-primary"
          >
            Actualizar
          </button>
          <button
            type="button"
            onClick={() => setHayVersionNueva(false)}
            className="min-h-touch rounded-control px-3 font-medium text-muted"
          >
            Después
          </button>
        </div>
      )}
    </>
  )
}
