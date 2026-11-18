import { describe, expect, it, vi } from 'vitest'
import { FuenteMapa } from './fuenteMapa'

const URL_MAPA = 'https://rutapoli.example/mapa/ipn.pmtiles?v=1'
// Archivo de prueba: bytes 0..99.
const ARCHIVO = Uint8Array.from({ length: 100 }, (_, i) => i).buffer

function rangoDe(init?: RequestInit): [number, number] {
  const r = new Headers(init?.headers).get('Range')!
  const [, a, b] = /bytes=(\d+)-(\d+)/.exec(r)!
  return [Number(a), Number(b)]
}

/** Servidor que respeta Range (como Vite o un bucket). */
const conRangos = () =>
  vi.fn(async (_u: RequestInfo | URL, init?: RequestInit) => {
    const [a, b] = rangoDe(init)
    return new Response(ARCHIVO.slice(a, b + 1), { status: 206 })
  })

/** Servidor que ignora Range y manda todo (Cloudflare Pages hoy). */
const sinRangos = () =>
  vi.fn(async () => {
    await new Promise((r) => setTimeout(r, 5))
    return new Response(ARCHIVO.slice(0), { status: 200 })
  })

const bytes = (r: { data: ArrayBuffer }) => [...new Uint8Array(r.data)]

describe('FuenteMapa', () => {
  it('usa la URL como clave (la del estilo pmtiles://)', () => {
    expect(new FuenteMapa(URL_MAPA).getKey()).toBe(URL_MAPA)
  })

  it('servidor con rangos: pide solo los trozos', async () => {
    const f = conRangos()
    const fuente = new FuenteMapa(URL_MAPA, { fetcher: f as never })
    expect(bytes(await fuente.getBytes(0, 4))).toEqual([0, 1, 2, 3])
    expect(bytes(await fuente.getBytes(50, 3))).toEqual([50, 51, 52])
    expect(f).toHaveBeenCalledTimes(2)
    expect(await fuente.archivoCompleto()).toBeNull()
  })

  it('servidor sin rangos: baja el archivo UNA vez aunque lleguen peticiones a la vez', async () => {
    const f = sinRangos()
    const fuente = new FuenteMapa(URL_MAPA, { fetcher: f as never })
    const [a, b, c] = await Promise.all([
      fuente.getBytes(0, 4),
      fuente.getBytes(10, 2),
      fuente.getBytes(97, 3),
    ])
    expect(bytes(a)).toEqual([0, 1, 2, 3])
    expect(bytes(b)).toEqual([10, 11])
    expect(bytes(c)).toEqual([97, 98, 99])
    expect(bytes(await fuente.getBytes(40, 1))).toEqual([40])
    expect(f).toHaveBeenCalledTimes(1)
    expect((await fuente.archivoCompleto())?.byteLength).toBe(100)
  })

  it('con copia guardada no toca la red (sin conexión)', async () => {
    const f = vi.fn(async () => {
      throw new TypeError('sin red')
    })
    const fuente = new FuenteMapa(URL_MAPA, {
      fetcher: f as never,
      leerCopia: async () => ARCHIVO.slice(0),
    })
    expect(bytes(await fuente.getBytes(20, 2))).toEqual([20, 21])
    expect(f).not.toHaveBeenCalled()
  })

  it('si la primera petición falla, la siguiente vuelve a intentar', async () => {
    let fallar = true
    const f = vi.fn(async (_u: RequestInfo | URL, init?: RequestInit) => {
      if (fallar) throw new TypeError('sin red')
      const [a, b] = rangoDe(init)
      return new Response(ARCHIVO.slice(a, b + 1), { status: 206 })
    })
    const fuente = new FuenteMapa(URL_MAPA, { fetcher: f as never })
    await expect(fuente.getBytes(0, 2)).rejects.toThrow()
    fallar = false
    expect(bytes(await fuente.getBytes(0, 2))).toEqual([0, 1])
  })

  it('un error del servidor se informa con claridad', async () => {
    const f = vi.fn(async () => new Response('no', { status: 404 }))
    const fuente = new FuenteMapa(URL_MAPA, { fetcher: f as never })
    await expect(fuente.getBytes(0, 2)).rejects.toThrow(/404/)
  })
})
