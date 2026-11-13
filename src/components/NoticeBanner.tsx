import { DISCLAIMER_TEXT, DISCLAIMER_TITLE } from '../lib/config'

/** Aviso visible de que el proyecto no es oficial del IPN. */
export function NoticeBanner() {
  return (
    <aside
      role="note"
      aria-label={DISCLAIMER_TITLE}
      className="rounded-card bg-notice-bg p-4 text-small text-notice-text"
    >
      <strong className="font-semibold">{DISCLAIMER_TITLE}.</strong> {DISCLAIMER_TEXT}
    </aside>
  )
}
