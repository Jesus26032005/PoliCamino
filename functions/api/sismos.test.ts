import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { responderSismos } from './sismos.ts'

const rss = readFileSync('src/lib/fixtures/ssn.xml', 'utf-8')
const falso = (r: Response | Error) =>
  vi.fn(async () => {
    if (r instanceof Error) throw r
    return r
  }) as unknown as typeof fetch

describe('responderSismos', () => {
  it('entrega el RSS con tipo XML y caché', async () => {
    const res = await responderSismos(falso(new Response(rss)))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/xml')
    expect(res.headers.get('cache-control')).toContain('s-maxage')
    expect(await res.text()).toContain('<rss')
  })
  it('502 si el SSN falla, responde algo que no es RSS o la red se cae', async () => {
    for (const f of [
      falso(new Response('x', { status: 500 })),
      falso(new Response('<html>mantenimiento</html>')),
      falso(new Error('timeout')),
    ]) {
      expect((await responderSismos(f)).status).toBe(502)
    }
  })
})
