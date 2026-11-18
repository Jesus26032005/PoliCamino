import type { RangeResponse, Source } from 'pmtiles'

type Opciones = {
  /** Para pruebas: por defecto, `fetch` del navegador. */
  fetcher?: typeof fetch
  /** Copia completa ya guardada (sin conexión / visitas siguientes), o null. */
  leerCopia?: () => Promise<ArrayBuffer | null>
}

/**
 * Fuente de bytes del PMTiles que funciona con cualquier hosting estático.
 *
 * MapLibre pide trozos del archivo (rangos). Cloudflare Pages, a la fecha, ignora el
 * encabezado Range y responde el archivo completo (200), así que pedir rangos ahí bajaría
 * 4.6 MB por cada trozo. Esta fuente decide con la PRIMERA petición:
 *   1. Si hay copia guardada, lee de ella (instantáneo y sin conexión).
 *   2. Si el servidor responde 206, sigue pidiendo solo rangos.
 *   3. Si responde 200, ya llegó el archivo entero: lo guarda en memoria y recorta.
 * Las peticiones simultáneas esperan a esa primera decisión: nunca se baja dos veces.
 */
export class FuenteMapa implements Source {
  private readonly url: string
  private readonly fetcher: typeof fetch
  private readonly leerCopia: () => Promise<ArrayBuffer | null>
  /** 'rangos' o el archivo completo, según la primera respuesta. */
  private modo: Promise<'rangos' | ArrayBuffer> | null = null

  constructor(url: string, { fetcher, leerCopia }: Opciones = {}) {
    this.url = url
    this.fetcher = fetcher ?? ((...a) => fetch(...a))
    this.leerCopia = leerCopia ?? (async () => null)
  }

  getKey() {
    return this.url
  }

  /** El archivo completo, si ya se tiene en memoria (para guardarlo sin bajarlo otra vez). */
  async archivoCompleto(): Promise<ArrayBuffer | null> {
    const m = await this.modo?.catch(() => null)
    return m instanceof ArrayBuffer ? m : null
  }

  private pedirRango(offset: number, length: number, signal?: AbortSignal) {
    return this.fetcher(this.url, {
      headers: { Range: `bytes=${offset}-${offset + length - 1}` },
      signal,
    })
  }

  async getBytes(
    offset: number,
    length: number,
    signal?: AbortSignal,
  ): Promise<RangeResponse> {
    const recortar = (b: ArrayBuffer): RangeResponse => ({
      data: b.slice(offset, offset + length),
    })

    if (!this.modo) {
      let primeraRespuesta: ArrayBuffer | null = null
      this.modo = (async () => {
        const copia = await this.leerCopia()
        if (copia) return copia
        // Sin `signal`: si MapLibre cancela esta petición, la decisión debe completarse igual.
        const res = await this.pedirRango(offset, length)
        if (res.status === 206) {
          primeraRespuesta = await res.arrayBuffer()
          return 'rangos' as const
        }
        if (res.ok) return await res.arrayBuffer()
        throw new Error(`El mapa base respondió ${res.status}`)
      })()
      const modo = await this.modo.catch((e) => {
        this.modo = null // un fallo de red no deja la fuente rota: se reintenta
        throw e
      })
      if (modo === 'rangos') return { data: primeraRespuesta! }
      return recortar(modo)
    }

    const modo = await this.modo
    if (modo !== 'rangos') return recortar(modo)
    const res = await this.pedirRango(offset, length, signal)
    if (res.status !== 206) throw new Error(`El mapa base respondió ${res.status}`)
    return { data: await res.arrayBuffer() }
  }
}
