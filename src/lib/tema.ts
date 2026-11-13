import { useSyncExternalStore } from 'react'

/** ¿La app está en tema oscuro? Respeta <html data-theme> y, si no, al sistema. */
function esOscuro(): boolean {
  const forzado = document.documentElement.dataset.theme
  if (forzado === 'dark') return true
  if (forzado === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function suscribir(avisar: () => void) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', avisar)
  const obs = new MutationObserver(avisar)
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
  return () => {
    mq.removeEventListener('change', avisar)
    obs.disconnect()
  }
}

export function useTemaOscuro(): boolean {
  return useSyncExternalStore(suscribir, esOscuro, () => false)
}

/** Lee un token CSS (ej. "--c-cat-escuela") del tema actual. */
export function leerToken(nombre: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim()
}
