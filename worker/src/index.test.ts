import { beforeEach, describe, expect, it } from 'vitest'
import type { ReporteBasico } from '../../src/lib/ocupacion.ts'
import type { Almacen, ReporteNuevo } from './db.ts'
import { manejar, reiniciarMemo, type Env } from './index.ts'

/** Almacén en memoria con la misma interfaz que D1. */
function almacenMemoria() {
  const filas: ReporteNuevo[] = []
  const bloqueados = new Set<string>()
  const a: Almacen = {
    estaBloqueado: async (hs) => hs.some((h) => bloqueados.has(h)),
    contarPorDispositivo: async (d, desde) =>
      filas.filter((f) => f.dispositivo === d && f.creado >= desde).length,
    contarPorIp: async (ip, desde) =>
      filas.filter((f) => f.ip === ip && f.creado >= desde).length,
    contarPorDispositivoYLugar: async (d, l, desde) =>
      filas.filter((f) => f.dispositivo === d && f.lugarId === l && f.creado >= desde)
        .length,
    insertar: async (r) => void filas.push(r),
    reportesDesde: async (desde): Promise<ReporteBasico[]> =>
      filas.filter((f) => f.creado >= desde),
    borrarAntesDe: async (t) => {
      for (let i = filas.length - 1; i >= 0; i--)
        if (filas[i].creado < t) filas.splice(i, 1)
    },
  }
  return { a, filas, bloqueados }
}

const ORIGEN = 'https://rutapoli.example'
const env: Env = {
  DB: {} as never,
  SAL_SECRETA: 'sal-de-prueba',
  ORIGENES_PERMITIDOS: `${ORIGEN},http://localhost:5173`,
}
const IDS = new Set(['cafe-1', 'bib-1'])
const AHORA = Date.UTC(2026, 10, 13, 18, 0, 0)
const disp = (n: number) => `dispositivo-${String(n).padStart(8, '0')}`

const post = (
  cuerpo: unknown,
  opts: { origen?: string | null; ip?: string; tipo?: string } = {},
) =>
  new Request('https://api.test/api/reportes', {
    method: 'POST',
    headers: {
      'Content-Type': opts.tipo ?? 'application/json',
      ...(opts.origen === null ? {} : { Origin: opts.origen ?? ORIGEN }),
      'CF-Connecting-IP': opts.ip ?? '1.2.3.4',
    },
    body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
  })
const get = (ruta: string, origen = ORIGEN) =>
  new Request(`https://api.test${ruta}`, { headers: { Origin: origen } })
type Cuerpo = {
  error?: string
  ventanaMin?: number
  lugares: Record<string, { nivel: number; reportes: number }>
}
const cuerpo = async (r: Response) => (await r.json()) as Cuerpo
const reporte = (n: number, lugarId = 'cafe-1', nivel = 3) => ({
  lugarId,
  nivel,
  dispositivo: disp(n),
})

let m: ReturnType<typeof almacenMemoria>
const llamar = (req: Request, ahora = AHORA, e: Env = env) =>
  manejar(req, e, m.a, ahora, IDS)

beforeEach(() => {
  m = almacenMemoria()
  reiniciarMemo()
})

describe('CORS y rutas básicas', () => {
  it('salud responde y el preflight autoriza solo orígenes permitidos', async () => {
    expect((await llamar(get('/api/salud'))).status).toBe(200)
    const ok = await llamar(
      new Request('https://api.test/api/reportes', {
        method: 'OPTIONS',
        headers: { Origin: ORIGEN },
      }),
    )
    expect(ok.status).toBe(204)
    expect(ok.headers.get('access-control-allow-origin')).toBe(ORIGEN)
    const mal = await llamar(
      new Request('https://api.test/api/reportes', {
        method: 'OPTIONS',
        headers: { Origin: 'https://malo.example' },
      }),
    )
    expect(mal.headers.get('access-control-allow-origin')).toBeNull()
  })
  it('ruta desconocida -> 404', async () => {
    expect((await llamar(get('/api/otra'))).status).toBe(404)
  })
})

describe('POST /api/reportes', () => {
  it('guarda un reporte válido (201) y NO guarda el id ni la IP en claro', async () => {
    const res = await llamar(post(reporte(1)))
    expect(res.status).toBe(201)
    expect(m.filas).toHaveLength(1)
    const f = m.filas[0]
    expect(f.dispositivo).not.toContain('dispositivo-0000')
    expect(f.dispositivo).toMatch(/^[0-9a-f]{64}$/)
    expect(f.ip).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(f)).not.toContain('1.2.3.4')
  })
  it('rechaza orígenes no permitidos o ausentes (403)', async () => {
    expect(
      (await llamar(post(reporte(1), { origen: 'https://malo.example' }))).status,
    ).toBe(403)
    expect((await llamar(post(reporte(1), { origen: null }))).status).toBe(403)
    expect(m.filas).toHaveLength(0)
  })
  it('valida tipo, tamaño, JSON y campos', async () => {
    expect((await llamar(post(reporte(1), { tipo: 'text/plain' }))).status).toBe(415)
    expect((await llamar(post('x'.repeat(2000)))).status).toBe(413)
    expect((await llamar(post('{no json'))).status).toBe(400)
    expect((await llamar(post({ ...reporte(1), nivel: 9 }))).status).toBe(400)
    expect((await llamar(post({ ...reporte(1), dispositivo: 'x' }))).status).toBe(400)
    expect(m.filas).toHaveLength(0)
  })
  it('solo acepta lugares del piloto (404 para otros)', async () => {
    expect((await llamar(post(reporte(1, 'escom-1')))).status).toBe(404)
  })
  it('sin SAL_SECRETA configurada falla con 500, no guarda nada', async () => {
    const res = await llamar(post(reporte(1)), AHORA, { ...env, SAL_SECRETA: undefined })
    expect(res.status).toBe(500)
    expect(m.filas).toHaveLength(0)
  })
  it('enfriamiento: mismo dispositivo y lugar, un reporte cada 10 min', async () => {
    expect((await llamar(post(reporte(1)))).status).toBe(201)
    const otra = await llamar(post(reporte(1)), AHORA + 5 * 60_000)
    expect(otra.status).toBe(429)
    expect(otra.headers.get('retry-after')).toBe('600')
    expect((await llamar(post(reporte(1)), AHORA + 11 * 60_000)).status).toBe(201)
  })
  it('otro lugar sí se puede reportar enseguida', async () => {
    await llamar(post(reporte(1, 'cafe-1')))
    expect((await llamar(post(reporte(1, 'bib-1')), AHORA + 1000)).status).toBe(201)
  })
  it('límite por dispositivo por hora', async () => {
    const ids10 = Array.from({ length: 10 }, (_, i) => `l-${i}`)
    const e = new Set(ids10)
    for (const id of ids10) {
      const r = await manejar(
        post({ lugarId: id, nivel: 2, dispositivo: disp(1) }, { ip: '9.9.9.9' }),
        env,
        m.a,
        AHORA,
        e,
      )
      expect(r.status).toBe(201)
    }
    e.add('l-extra')
    const r11 = await manejar(
      post({ lugarId: 'l-extra', nivel: 2, dispositivo: disp(1) }),
      env,
      m.a,
      AHORA,
      e,
    )
    expect(r11.status).toBe(429)
    expect((await cuerpo(r11)).error).toBe('limite-dispositivo')
  })
  it('límite por IP por hora (varios dispositivos desde una misma red)', async () => {
    const e = new Set(Array.from({ length: 25 }, (_, i) => `l-${i}`))
    let ultimo = 201
    for (let i = 0; i < 21; i++) {
      const r = await manejar(
        post(
          { lugarId: `l-${i}`, nivel: 2, dispositivo: disp(100 + i) },
          { ip: '5.5.5.5' },
        ),
        env,
        m.a,
        AHORA,
        e,
      )
      ultimo = r.status
    }
    expect(ultimo).toBe(429)
    expect(m.filas).toHaveLength(20)
  })
  it('dispositivos o IP bloqueados reciben 403', async () => {
    await llamar(post(reporte(7)))
    m.bloqueados.add(m.filas[0].dispositivo)
    const r = await llamar(post(reporte(7, 'bib-1')), AHORA + 60_000)
    expect(r.status).toBe(403)
  })
})

describe('GET /api/ocupacion', () => {
  it('sin reportes, lista vacía y caché pública corta', async () => {
    const res = await llamar(get('/api/ocupacion'))
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toContain('max-age=30')
    expect(await res.json()).toMatchObject({ lugares: {}, ventanaMin: 45 })
  })
  it('con 3 dispositivos distintos muestra la mediana; con 2 no muestra nada', async () => {
    await llamar(post(reporte(1, 'cafe-1', 4), { ip: '1.1.1.1' }))
    await llamar(post(reporte(2, 'cafe-1', 3), { ip: '2.2.2.2' }), AHORA + 1000)
    expect(
      (await cuerpo(await llamar(get('/api/ocupacion'), AHORA + 60_000))).lugares,
    ).toEqual({})
    await llamar(post(reporte(3, 'cafe-1', 3), { ip: '3.3.3.3' }), AHORA + 2000)
    const j = await cuerpo(await llamar(get('/api/ocupacion'), AHORA + 60_000))
    expect(j.lugares['cafe-1']).toMatchObject({ nivel: 3, reportes: 3 })
  })
  it('los reportes caducan a los 45 min', async () => {
    for (const n of [1, 2, 3])
      await llamar(post(reporte(n), { ip: `${n}.${n}.${n}.${n}` }), AHORA)
    reiniciarMemo()
    const j = await cuerpo(await llamar(get('/api/ocupacion'), AHORA + 46 * 60_000))
    expect(j.lugares).toEqual({})
  })
  it('la limpieza diaria borra lo de más de 24 h', async () => {
    await llamar(post(reporte(1)))
    await m.a.borrarAntesDe(AHORA + 1)
    expect(m.filas).toHaveLength(0)
  })
})

describe('lista de lugares con ocupación', () => {
  it('está sincronizada con los datos (si falla: npm run generar:ocupacion)', async () => {
    const { default: lugares } = await import('../../src/data/zacatenco.lugares.json')
    const { default: ids } = await import('./ids-ocupacion.json')
    const { admiteOcupacion } = await import('../../src/lib/ocupacion.ts')
    const esperados = lugares
      .filter((l) => admiteOcupacion(l.categoria as never))
      .map((l) => l.id)
      .sort()
    expect(ids).toEqual(esperados)
    expect(esperados.length).toBeGreaterThan(0)
  })
})
