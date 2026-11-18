import { useSyncExternalStore } from 'react'

function suscribir(avisar: () => void) {
  window.addEventListener('online', avisar)
  window.addEventListener('offline', avisar)
  return () => {
    window.removeEventListener('online', avisar)
    window.removeEventListener('offline', avisar)
  }
}

/** ¿El navegador cree que hay conexión? (Puede decir "sí" con una red sin internet.) */
export function useEnLinea(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => navigator.onLine,
    () => true,
  )
}
