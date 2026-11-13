/**
 * Proxy mínimo de los "últimos sismos" del Servicio Sismológico Nacional (SSN).
 *
 * Por qué existe: el SSN solo publica su RSS por HTTP (el puerto 443 rechaza la conexión)
 * y sin cabeceras CORS, así que una página HTTPS no puede leerlo directamente desde el navegador.
 * Esta función lo pide desde el servidor y lo entrega tal cual, en el mismo origen que la app.
 *
 * Formato Web estándar (`export default { fetch }`), compatible con Vercel Functions.
 * OJO: aún no se ha probado desplegada; se verifica en la Fase 7.
 */
const ORIGEN_SSN = 'http://www.ssn.unam.mx/rss/ultimos-sismos.xml'
const MAX_BYTES = 200_000

const fallo = () =>
  new Response('El SSN no está disponible ahora', {
    status: 502,
    headers: { 'Cache-Control': 'no-store' },
  })

export async function responderSismos(fetcher: typeof fetch = fetch): Promise<Response> {
  try {
    const r = await fetcher(ORIGEN_SSN, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'RutaPoli/0.1 (proyecto estudiantil no oficial)' },
    })
    if (!r.ok) return fallo()
    const texto = await r.text()
    if (!texto.includes('<rss') || texto.length > MAX_BYTES) return fallo()
    return new Response(texto, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        // El SSN actualiza cada tanto; 2 min en el borde alivian su servidor.
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    })
  } catch {
    return fallo()
  }
}

export default {
  fetch: () => responderSismos(),
}
