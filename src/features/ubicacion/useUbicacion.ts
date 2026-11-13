import { useCallback, useState } from 'react'

export type Ubicacion = { lat: number; lng: number; precisionM: number }

export type EstadoUbicacion =
  'inactivo' | 'buscando' | 'listo' | 'denegado' | 'no-disponible' | 'tiempo-agotado'

export const MENSAJE_UBICACION: Record<EstadoUbicacion, string> = {
  inactivo: '',
  buscando: 'Buscando tu ubicación…',
  listo: '',
  denegado:
    'No diste permiso de ubicación. La app funciona igual; puedes activarlo en los ajustes del navegador.',
  'no-disponible': 'Tu dispositivo no pudo darnos su ubicación en este momento.',
  'tiempo-agotado': 'Tardó demasiado en encontrar tu ubicación. Intenta de nuevo.',
}

/** La ubicación solo se pide cuando se llama a `solicitar` (al tocar el botón). */
export function useUbicacion() {
  const [estado, setEstado] = useState<EstadoUbicacion>('inactivo')
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null)

  const solicitar = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setEstado('no-disponible')
      return
    }
    setEstado('buscando')
    navigator.geolocation.getCurrentPosition(
      (p) => {
        // Objeto nuevo cada vez: tocar el botón de nuevo vuelve a centrar el mapa.
        setUbicacion({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          precisionM: p.coords.accuracy,
        })
        setEstado('listo')
      },
      (e) =>
        setEstado(
          e.code === 1 ? 'denegado' : e.code === 3 ? 'tiempo-agotado' : 'no-disponible',
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    )
  }, [])

  return { estado, ubicacion, solicitar }
}
