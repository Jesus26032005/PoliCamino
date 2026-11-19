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

/** Celulares muy angostos (≤ 359 px, p. ej. 320 px): textos de la barra más cortos. */
const ANGOSTA = '(max-width: 22.4375rem)'
export function useEsAngosta(): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const mq = window.matchMedia(ANGOSTA)
      mq.addEventListener('change', avisar)
      return () => mq.removeEventListener('change', avisar)
    },
    () => window.matchMedia(ANGOSTA).matches,
    () => false,
  )
}
