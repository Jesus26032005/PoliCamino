/** Caché breve en sessionStorage: evita pedir lo mismo en cada apertura de la tarjeta. */

type Almacen = Pick<Storage, 'getItem' | 'setItem'>

export type Entrada<T> = { datos: T; consultadoEn: number }

type Opciones = {
  /** Ignora lo guardado (botón "Actualizar"). */
  forzar?: boolean
  almacen?: Almacen | null
  ahora?: () => number
}

function almacenPorDefecto(): Almacen | null {
  try {
    return window.sessionStorage
  } catch {
    return null // modo privado o almacenamiento bloqueado: se funciona sin caché
  }
}

export async function conCache<T>(
  clave: string,
  ttlMs: number,
  pedir: () => Promise<T>,
  { forzar = false, almacen = almacenPorDefecto(), ahora = Date.now }: Opciones = {},
): Promise<Entrada<T>> {
  const k = `rutapoli:${clave}`
  if (!forzar && almacen) {
    try {
      const crudo = almacen.getItem(k)
      if (crudo) {
        const e = JSON.parse(crudo) as Entrada<T>
        if (typeof e.consultadoEn === 'number' && ahora() - e.consultadoEn < ttlMs)
          return e
      }
    } catch {
      /* caché ilegible: se ignora */
    }
  }
  const entrada: Entrada<T> = { datos: await pedir(), consultadoEn: ahora() }
  try {
    almacen?.setItem(k, JSON.stringify(entrada))
  } catch {
    /* sin espacio o bloqueado: no pasa nada */
  }
  return entrada
}
