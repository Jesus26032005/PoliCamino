import { describe, expect, it } from 'vitest'
import { busquedaConLugar, enlaceDeLugar, leerLugarDeUrl } from './enlaces'

describe('enlaces', () => {
  it('lee el lugar de la URL', () => {
    expect(leerLugarDeUrl('?lugar=osm-w1')).toBe('osm-w1')
    expect(leerLugarDeUrl('')).toBeNull()
    expect(leerLugarDeUrl('?lugar=')).toBeNull()
  })
  it('arma el enlace compartible', () => {
    expect(enlaceDeLugar('osm-w1', { origin: 'https://x.mx', pathname: '/' })).toBe(
      'https://x.mx/?lugar=osm-w1',
    )
  })
  it('pone y quita el lugar conservando otros parámetros', () => {
    expect(busquedaConLugar('', 'a')).toBe('?lugar=a')
    expect(busquedaConLugar('?lugar=a&z=1', null)).toBe('?z=1')
    expect(busquedaConLugar('?lugar=a', null)).toBe('')
  })
})
