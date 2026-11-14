import { describe, expect, it } from 'vitest'
import { busquedaCon, enlaceDeLugar, leerCampusDeUrl, leerLugarDeUrl } from './enlaces'

describe('enlaces', () => {
  it('lee lugar y campus de la URL', () => {
    expect(leerLugarDeUrl('?lugar=osm-w1')).toBe('osm-w1')
    expect(leerLugarDeUrl('')).toBeNull()
    expect(leerLugarDeUrl('?lugar=')).toBeNull()
    expect(leerCampusDeUrl('?campus=santo-tomas&lugar=x')).toBe('santo-tomas')
    expect(leerCampusDeUrl('?lugar=x')).toBeNull()
  })
  it('arma el enlace compartible (con campus si se da)', () => {
    const base = { origin: 'https://x.mx', pathname: '/' }
    expect(enlaceDeLugar('osm-w1', base)).toBe('https://x.mx/?lugar=osm-w1')
    expect(enlaceDeLugar('osm-w1', base, 'santo-tomas')).toBe(
      'https://x.mx/?campus=santo-tomas&lugar=osm-w1',
    )
  })
  it('pone y quita lugar y campus conservando otros parámetros', () => {
    expect(busquedaCon('', { lugar: 'a' })).toBe('?lugar=a')
    expect(busquedaCon('?lugar=a&z=1', { lugar: null })).toBe('?z=1')
    expect(busquedaCon('?lugar=a', { lugar: null })).toBe('')
    expect(busquedaCon('?lugar=a', { campus: 'santo-tomas', lugar: null })).toBe(
      '?campus=santo-tomas',
    )
    expect(busquedaCon('?campus=x&lugar=a', { campus: 'y' })).toBe('?campus=y&lugar=a') // lugar intacto
  })
})
