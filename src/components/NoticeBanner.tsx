import { DISCLAIMER_TEXT, DISCLAIMER_TITLE } from '../lib/config'

/** Aviso siempre visible de que el proyecto no es oficial del IPN. */
export function NoticeBanner({ className = '' }: { className?: string }) {
  return (
    <p
      role="note"
      title={DISCLAIMER_TEXT}
      className={`inline-flex min-h-7 items-center rounded-pill bg-notice-bg px-3 text-mini font-semibold text-notice-text shadow-flotante ${className}`}
    >
      {DISCLAIMER_TITLE} · No pertenece al IPN
    </p>
  )
}
