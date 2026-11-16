import { useSyncExternalStore } from 'react'

/** Debe coincidir con `--breakpoint-desk` en tokens.css. */
const CONSULTA = '(min-width: 56rem)'

function suscribir(avisar: () => void) {
  const mq = window.matchMedia(CONSULTA)
  mq.addEventListener('change', avisar)
  return () => mq.removeEventListener('change', avisar)
}

/** true cuando la interfaz usa el panel lateral (escritorio); false = hoja inferior (móvil). */
export function useEsEscritorio(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => window.matchMedia(CONSULTA).matches,
    () => false,
  )
}

export const esEscritorioAhora = () => window.matchMedia(CONSULTA).matches
