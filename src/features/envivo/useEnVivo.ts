import { useMemo } from 'react'
import type { LatLng } from '../../lib/tipos'
import { cargarAire, cargarClima, cargarSismos } from './fuentes'
import { useFuente } from './useFuente'

export function useEnVivo(centro: LatLng) {
  const clima = useFuente(useMemo(() => cargarClima(centro), [centro]))
  const aire = useFuente(useMemo(() => cargarAire(centro), [centro]))
  const sismos = useFuente(cargarSismos)
  return { clima, aire, sismos }
}

export type EnVivo = ReturnType<typeof useEnVivo>
