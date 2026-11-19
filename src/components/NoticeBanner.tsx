import { DISCLAIMER_TEXT, DISCLAIMER_TITLE } from '../lib/config'

/**
 * Aviso siempre visible de que el proyecto no es oficial del IPN.
 * `compacto`: versión corta (móvil, después de la primera visita); el texto completo
 * sigue disponible para lectores de pantalla y al pasar el puntero.
 */
export function NoticeBanner({
  className = '',
  compacto = false,
}: {
  className?: string
  compacto?: boolean
}) {
  return (
    <p
      role="note"
      title={DISCLAIMER_TEXT}
      className={`inline-flex min-h-7 items-center rounded-pill bg-notice-bg px-3 text-mini font-semibold text-notice-text shadow-flotante ${className}`}
    >
      {compacto ? (
        <>
          <span aria-hidden="true">No oficial · No es del IPN</span>
          <span className="sr-only">{DISCLAIMER_TITLE}: no pertenece al IPN</span>
        </>
      ) : (
        <>{DISCLAIMER_TITLE} · No pertenece al IPN</>
      )}
    </p>
  )
}
