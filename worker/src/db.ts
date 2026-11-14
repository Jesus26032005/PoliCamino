import type { Nivel, ReporteBasico } from '../../src/lib/ocupacion.ts'

/** Lo mínimo que usamos de D1 (así el código se prueba sin Cloudflare). */
export type D1Like = {
  prepare(consulta: string): {
    bind(...valores: unknown[]): {
      first<T = unknown>(): Promise<T | null>
      all<T = unknown>(): Promise<{ results: T[] }>
      run(): Promise<unknown>
    }
  }
}

export type ReporteNuevo = {
  lugarId: string
  nivel: Nivel
  creado: number
  dispositivo: string
  ip: string
}

/** Operaciones de almacenamiento que necesita el Worker. */
export interface Almacen {
  estaBloqueado(hashes: string[]): Promise<boolean>
  contarPorDispositivo(dispositivo: string, desde: number): Promise<number>
  contarPorIp(ip: string, desde: number): Promise<number>
  contarPorDispositivoYLugar(
    dispositivo: string,
    lugarId: string,
    desde: number,
  ): Promise<number>
  insertar(r: ReporteNuevo): Promise<void>
  reportesDesde(desde: number): Promise<ReporteBasico[]>
  borrarAntesDe(instante: number): Promise<void>
}

type Fila = { lugar_id: string; nivel: number; creado: number; dispositivo: string }

export function almacenD1(db: D1Like): Almacen {
  const contar = async (sql: string, ...v: unknown[]) =>
    (
      await db
        .prepare(sql)
        .bind(...v)
        .first<{ n: number }>()
    )?.n ?? 0
  return {
    async estaBloqueado(hashes) {
      const marcas = hashes.map(() => '?').join(',')
      return (
        (await contar(
          `SELECT COUNT(*) AS n FROM bloqueados WHERE hash IN (${marcas})`,
          ...hashes,
        )) > 0
      )
    },
    contarPorDispositivo: (d, desde) =>
      contar(
        'SELECT COUNT(*) AS n FROM reportes WHERE dispositivo = ? AND creado >= ?',
        d,
        desde,
      ),
    contarPorIp: (ip, desde) =>
      contar(
        'SELECT COUNT(*) AS n FROM reportes WHERE ip = ? AND creado >= ?',
        ip,
        desde,
      ),
    contarPorDispositivoYLugar: (d, lugar, desde) =>
      contar(
        'SELECT COUNT(*) AS n FROM reportes WHERE dispositivo = ? AND lugar_id = ? AND creado >= ?',
        d,
        lugar,
        desde,
      ),
    async insertar(r) {
      await db
        .prepare(
          'INSERT INTO reportes (lugar_id, nivel, creado, dispositivo, ip) VALUES (?, ?, ?, ?, ?)',
        )
        .bind(r.lugarId, r.nivel, r.creado, r.dispositivo, r.ip)
        .run()
    },
    async reportesDesde(desde) {
      const { results } = await db
        .prepare(
          'SELECT lugar_id, nivel, creado, dispositivo FROM reportes WHERE creado >= ?',
        )
        .bind(desde)
        .all<Fila>()
      return results.map((f) => ({
        lugarId: f.lugar_id,
        nivel: f.nivel as Nivel,
        creado: f.creado,
        dispositivo: f.dispositivo,
      }))
    },
    async borrarAntesDe(instante) {
      await db.prepare('DELETE FROM reportes WHERE creado < ?').bind(instante).run()
    },
  }
}
