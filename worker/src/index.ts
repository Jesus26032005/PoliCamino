/**
 * Worker de ocupación (Fase 5-A): recibe reportes anónimos y entrega la ocupación agregada.
 *
 *   GET  /api/ocupacion  -> { generado, ventanaMin, lugares: { [id]: { nivel, reportes, ultimo } } }
 *   POST /api/reportes   -> { lugarId, nivel (1-4), dispositivo }
 *   GET  /api/salud      -> { ok: true }
 *
 * Privacidad: no hay cuentas ni ubicación. Se guarda un hash del identificador del dispositivo
 * y un hash de la IP con sal diaria, solo para frenar abusos, y se borran a las 24 h.
 */
import {
  agregarOcupacion,
  ENFRIAMIENTO_MS,
  MAX_POR_DISPOSITIVO_HORA,
  MAX_POR_IP_HORA,
  RETENCION_MS,
  validarReporte,
  VENTANA_MS,
} from '../../src/lib/ocupacion.ts'
import { almacenD1, type Almacen, type D1Like } from './db.ts'
import idsJson from './ids-ocupacion.json' with { type: 'json' }

export type Env = {
  DB: D1Like
  /** Secreto para los hashes (wrangler secret put SAL_SECRETA). */
  SAL_SECRETA?: string
  /** Orígenes permitidos separados por coma. */
  ORIGENES_PERMITIDOS?: string
}

const IDS_PERMITIDOS: ReadonlySet<string> = new Set(idsJson as string[])
const MAX_CUERPO = 1024
const HORA = 3_600_000
const CACHE_MS = 20_000

let memo: { t: number; cuerpo: string } | null = null
/** Solo para pruebas. */
export const reiniciarMemo = () => {
  memo = null
}

async function huella(...partes: string[]): Promise<string> {
  const datos = new TextEncoder().encode(partes.join('|'))
  const h = await crypto.subtle.digest('SHA-256', datos)
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function cabecerasCors(req: Request, env: Env): Record<string, string> {
  const origen = req.headers.get('Origin')
  const permitidos = (env.ORIGENES_PERMITIDOS ?? '').split(',').map((s) => s.trim())
  if (!origen || !permitidos.includes(origen)) return { Vary: 'Origin' }
  return {
    'Access-Control-Allow-Origin': origen,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  }
}

const json = (cuerpo: unknown, estado: number, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra },
  })

const error = (
  estado: number,
  codigo: string,
  mensaje: string,
  extra: Record<string, string> = {},
) => json({ error: codigo, mensaje }, estado, extra)

export async function manejar(
  req: Request,
  env: Env,
  almacen: Almacen,
  ahora: number,
  ids: ReadonlySet<string> = IDS_PERMITIDOS,
): Promise<Response> {
  const cors = cabecerasCors(req, env)
  const { pathname } = new URL(req.url)

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

  if (pathname === '/api/salud' && req.method === 'GET')
    return json({ ok: true }, 200, cors)

  if (pathname === '/api/ocupacion' && req.method === 'GET') {
    // Pocos segundos de caché en memoria: protege la base de datos si hay muchas lecturas.
    if (!memo || ahora - memo.t > CACHE_MS) {
      const reportes = await almacen.reportesDesde(ahora - VENTANA_MS)
      memo = {
        t: ahora,
        cuerpo: JSON.stringify({
          generado: ahora,
          ventanaMin: VENTANA_MS / 60_000,
          lugares: agregarOcupacion(reportes, ahora),
        }),
      }
    }
    return new Response(memo.cuerpo, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=30',
        ...cors,
      },
    })
  }

  if (pathname === '/api/reportes' && req.method === 'POST') {
    // Solo páginas autorizadas pueden enviar reportes (frena scripts casuales; no es una barrera fuerte).
    if (!cors['Access-Control-Allow-Origin'])
      return error(403, 'origen', 'Origen no permitido', cors)
    if (!env.SAL_SECRETA)
      return error(500, 'configuracion', 'El servicio no está configurado', cors)
    if (!(req.headers.get('Content-Type') ?? '').includes('application/json'))
      return error(415, 'tipo', 'Se esperaba JSON', cors)

    const texto = await req.text()
    if (texto.length > MAX_CUERPO)
      return error(413, 'tamano', 'Reporte demasiado grande', cors)
    let cuerpo: unknown
    try {
      cuerpo = JSON.parse(texto)
    } catch {
      return error(400, 'json', 'JSON inválido', cors)
    }
    const r = validarReporte(cuerpo)
    if (!r.ok) return error(400, 'reporte', r.error, cors)
    if (!ids.has(r.lugarId))
      return error(404, 'lugar', 'Ese lugar no acepta reportes de ocupación', cors)

    const dispositivo = await huella(env.SAL_SECRETA, 'disp', r.dispositivo)
    const dia = new Date(ahora).toISOString().slice(0, 10)
    const ip = await huella(
      env.SAL_SECRETA,
      'ip',
      dia,
      req.headers.get('CF-Connecting-IP') ?? 'sin-ip',
    )

    if (await almacen.estaBloqueado([dispositivo, ip]))
      return error(403, 'bloqueado', 'Este dispositivo no puede enviar reportes', cors)

    const limite = (segundos: number, codigo: string, mensaje: string) =>
      error(429, codigo, mensaje, { ...cors, 'Retry-After': String(segundos) })

    if (
      (await almacen.contarPorDispositivoYLugar(
        dispositivo,
        r.lugarId,
        ahora - ENFRIAMIENTO_MS,
      )) > 0
    )
      return limite(
        ENFRIAMIENTO_MS / 1000,
        'enfriamiento',
        'Ya reportaste este lugar hace poco',
      )
    if (
      (await almacen.contarPorDispositivo(dispositivo, ahora - HORA)) >=
      MAX_POR_DISPOSITIVO_HORA
    )
      return limite(
        HORA / 1000,
        'limite-dispositivo',
        'Demasiados reportes desde este dispositivo',
      )
    if ((await almacen.contarPorIp(ip, ahora - HORA)) >= MAX_POR_IP_HORA)
      return limite(HORA / 1000, 'limite-red', 'Demasiados reportes desde esta red')

    await almacen.insertar({
      lugarId: r.lugarId,
      nivel: r.nivel,
      creado: ahora,
      dispositivo,
      ip,
    })
    memo = null
    return json({ ok: true }, 201, cors)
  }

  return error(404, 'no-encontrado', 'Ruta no encontrada', cors)
}

export default {
  fetch: (req: Request, env: Env) => manejar(req, env, almacenD1(env.DB), Date.now()),
  /** Tarea diaria (cron): borra reportes con más de 24 h. */
  scheduled: async (_evento: unknown, env: Env) => {
    await almacenD1(env.DB).borrarAntesDe(Date.now() - RETENCION_MS)
  },
}
