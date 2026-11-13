import { describe, expect, it, vi } from 'vitest'
import { conCache } from './cache'

function almacenFalso() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  }
}

describe('conCache', () => {
  it('reutiliza el dato dentro del TTL y vuelve a pedir después', async () => {
    const almacen = almacenFalso()
    let t = 1000
    const pedir = vi.fn(async () => 'dato')
    const o = { almacen, ahora: () => t }
    await conCache('x', 60_000, pedir, o)
    t += 59_000
    const e = await conCache('x', 60_000, pedir, o)
    expect(pedir).toHaveBeenCalledTimes(1)
    expect(e.consultadoEn).toBe(1000)
    t += 2_000
    await conCache('x', 60_000, pedir, o)
    expect(pedir).toHaveBeenCalledTimes(2)
  })
  it('forzar ignora la caché', async () => {
    const almacen = almacenFalso()
    const pedir = vi.fn(async () => 1)
    await conCache('y', 60_000, pedir, { almacen })
    await conCache('y', 60_000, pedir, { almacen, forzar: true })
    expect(pedir).toHaveBeenCalledTimes(2)
  })
  it('funciona sin almacenamiento y con caché corrupta', async () => {
    const pedir = vi.fn(async () => 'ok')
    expect((await conCache('z', 1000, pedir, { almacen: null })).datos).toBe('ok')
    const corrupto = { getItem: () => '{no es json', setItem: () => {} }
    expect((await conCache('z', 1000, pedir, { almacen: corrupto })).datos).toBe('ok')
  })
  it('si la petición falla, el error llega a quien llama (no se cachea)', async () => {
    const almacen = almacenFalso()
    await expect(
      conCache(
        'w',
        1000,
        async () => {
          throw new Error('x')
        },
        { almacen },
      ),
    ).rejects.toThrow('x')
    expect(almacen.getItem('rutapoli:w')).toBeNull()
  })
})
