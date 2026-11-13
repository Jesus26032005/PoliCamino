import { describe, expect, it, vi } from 'vitest'
import {
  ErrorRuta,
  formatearDistancia,
  formatearDuracion,
  leerRespuestaRuta,
  pedirRuta,
  rutaAGeoJSON,
  urlRuta,
} from './ruta'

// Respuesta real (acortada) de routing.openstreetmap.de/routed-foot, ESCOM -> Biblioteca Nacional.
const respuesta = {
  code: 'Ok',
  routes: [
    {
      distance: 2171.1,
      duration: 1726.1,
      geometry: {
        coordinates: [
          [-99.147179, 19.504238],
          [-99.147464, 19.503706],
          [-99.1336, 19.4961],
        ],
      },
    },
  ],
}

const ok = (cuerpo: unknown, estado = 200) =>
  vi.fn(async () => new Response(JSON.stringify(cuerpo), { status: estado }))

describe('urlRuta', () => {
  it('usa el perfil a pie y el orden lng,lat', () => {
    const u = urlRuta([19.5042, -99.1471], [19.4961, -99.1336])
    expect(u).toContain('/routed-foot/route/v1/foot/-99.1471,19.5042;-99.1336,19.4961')
    expect(u).toContain('geometries=geojson')
  })
})

describe('leerRespuestaRuta', () => {
  it('extrae distancia, duración y geometría', () => {
    const r = leerRespuestaRuta(respuesta)
    expect(r.distanciaM).toBe(2171.1)
    expect(r.duracionS).toBe(1726.1)
    expect(r.coordenadas).toHaveLength(3)
  })
  it('NoRoute -> sin-ruta', () => {
    expect(() => leerRespuestaRuta({ code: 'NoRoute' })).toThrowError(
      expect.objectContaining({ codigo: 'sin-ruta' }),
    )
  })
  it('respuestas rotas -> formato, sin lanzar errores raros', () => {
    for (const mala of [
      null,
      'x',
      {},
      { code: 'Ok', routes: [] },
      { code: 'Ok', routes: [{ distance: 1 }] },
    ]) {
      expect(() => leerRespuestaRuta(mala)).toThrow(ErrorRuta)
    }
  })
})

describe('pedirRuta', () => {
  it('devuelve la ruta y la recuerda (segunda vez no consulta)', async () => {
    const f = ok(respuesta)
    const a = await pedirRuta([19.1, -99.1], [19.2, -99.2], {
      fetcher: f as never,
      intervaloMs: 0,
    })
    const b = await pedirRuta([19.1, -99.1], [19.2, -99.2], {
      fetcher: f as never,
      intervaloMs: 0,
    })
    expect(a).toBe(b)
    expect(f).toHaveBeenCalledTimes(1)
  })
  it('error de red -> codigo red', async () => {
    const f = vi.fn(async () => {
      throw new TypeError('fallo')
    })
    await expect(
      pedirRuta([19.3, -99.1], [19.4, -99.2], { fetcher: f as never, intervaloMs: 0 }),
    ).rejects.toMatchObject({ codigo: 'red' })
  })
  it('estado 500 -> servidor; 400 con NoRoute -> sin-ruta', async () => {
    await expect(
      pedirRuta([19.5, -99.1], [19.6, -99.2], {
        fetcher: ok({}, 500) as never,
        intervaloMs: 0,
      }),
    ).rejects.toMatchObject({ codigo: 'servidor' })
    await expect(
      pedirRuta([19.7, -99.1], [19.8, -99.2], {
        fetcher: ok({ code: 'NoRoute' }, 400) as never,
        intervaloMs: 0,
      }),
    ).rejects.toMatchObject({ codigo: 'sin-ruta' })
  })
})

describe('formato', () => {
  it('distancias', () => {
    expect(formatearDistancia(4)).toBe('10 m')
    expect(formatearDistancia(847)).toBe('850 m')
    expect(formatearDistancia(2171.1)).toBe('2.2 km')
  })
  it('duraciones', () => {
    expect(formatearDuracion(20)).toBe('≈ 1 min')
    expect(formatearDuracion(1726.1)).toBe('≈ 29 min')
    expect(formatearDuracion(3600)).toBe('≈ 1 h')
    expect(formatearDuracion(3900)).toBe('≈ 1 h 5 min')
  })
})

describe('rutaAGeoJSON', () => {
  it('incluye línea, origen y destino en [lng, lat]', () => {
    const g = rutaAGeoJSON(leerRespuestaRuta(respuesta), [19.5, -99.1], [19.6, -99.2])
    expect(g.features.map((f) => f.properties.rol)).toEqual(['ruta', 'origen', 'destino'])
    expect(g.features[1].geometry.coordinates).toEqual([-99.1, 19.5])
  })
})
