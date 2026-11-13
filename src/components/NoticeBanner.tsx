import { DISCLAIMER_TEXT, DISCLAIMER_TITLE } from '../lib/config'

/** Aviso visible de que el proyecto no es oficial del IPN. */
export function NoticeBanner({ compacto = false }: { compacto?: boolean }) {
  return (
    <aside
      role="note"
      aria-label={DISCLAIMER_TITLE}
      className={`bg-notice-bg text-small text-notice-text ${compacto ? 'px-4 py-2' : 'rounded-card p-4'}`}
    >
      <strong className="font-semibold">{DISCLAIMER_TITLE}.</strong>{' '}
      {compacto ? 'No pertenece al IPN.' : DISCLAIMER_TEXT}
    </aside>
  )
}
