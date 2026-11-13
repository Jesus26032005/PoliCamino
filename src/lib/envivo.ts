import type { LatLng } from './tipos'

/** Error al obtener o leer datos en vivo; `mensaje` se muestra a la persona. */
export class ErrorEnVivo extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'ErrorEnVivo'
  }
}

// ───────────── Clima (Open-Meteo, https://open-meteo.com — CC BY 4.0) ─────────────

export type Clima = {
  temperaturaC: number
  sensacionC: number
  humedadPct: number
  precipitacionMm: number
  vientoKmh: number
  codigo: number
  /** Hora local del dato, "AAAA-MM-DDTHH:MM" (zona America/Mexico_City). */
  hora: string
}

export function urlClima([lat, lng]: LatLng): string {
  const p = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current:
      'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
    timezone: 'America/Mexico_City',
  })
  return `https://api.open-meteo.com/v1/forecast?${p}`
}

const num = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)

export function leerClima(json: unknown): Clima {
  const c = (json as { current?: Record<string, unknown> } | null)?.current
  if (
    !c ||
    !num(c.temperature_2m) ||
    !num(c.apparent_temperature) ||
    !num(c.relative_humidity_2m) ||
    !num(c.precipitation) ||
    !num(c.weather_code) ||
    !num(c.wind_speed_10m) ||
    typeof c.time !== 'string'
  )
    throw new ErrorEnVivo('La respuesta del clima llegó incompleta')
  return {
    temperaturaC: c.temperature_2m,
    sensacionC: c.apparent_temperature,
    humedadPct: c.relative_humidity_2m,
    precipitacionMm: c.precipitation,
    vientoKmh: c.wind_speed_10m,
    codigo: c.weather_code,
    hora: c.time,
  }
}

/** Códigos WMO de "weather_code" (tabla de la documentación de Open-Meteo). */
const CODIGOS_WMO: [number[], string][] = [
  [[0], 'Despejado'],
  [[1], 'Mayormente despejado'],
  [[2], 'Parcialmente nublado'],
  [[3], 'Nublado'],
  [[45, 48], 'Niebla'],
  [[51, 53, 55], 'Llovizna'],
  [[56, 57], 'Llovizna helada'],
  [[61, 63, 65], 'Lluvia'],
  [[66, 67], 'Lluvia helada'],
  [[71, 73, 75, 77], 'Nieve'],
  [[80, 81, 82], 'Chubascos'],
  [[85, 86], 'Chubascos de nieve'],
  [[95], 'Tormenta eléctrica'],
  [[96, 99], 'Tormenta con granizo'],
]

export function descripcionClima(codigo: number): string {
  return CODIGOS_WMO.find(([cs]) => cs.includes(codigo))?.[1] ?? 'Condición no reconocida'
}

// ───────────── Calidad del aire (Open-Meteo, modelo CAMS) ─────────────

export type Aire = {
  usAqi: number
  pm25: number
  pm10: number
  ozono: number
  hora: string
}

export function urlAire([lat, lng]: LatLng): string {
  const p = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: 'us_aqi,pm2_5,pm10,ozone',
    timezone: 'America/Mexico_City',
  })
  return `https://air-quality-api.open-meteo.com/v1/air-quality?${p}`
}

export function leerAire(json: unknown): Aire {
  const c = (json as { current?: Record<string, unknown> } | null)?.current
  if (
    !c ||
    !num(c.us_aqi) ||
    !num(c.pm2_5) ||
    !num(c.pm10) ||
    !num(c.ozone) ||
    typeof c.time !== 'string'
  )
    throw new ErrorEnVivo('La respuesta de calidad del aire llegó incompleta')
  return { usAqi: c.us_aqi, pm25: c.pm2_5, pm10: c.pm10, ozono: c.ozone, hora: c.time }
}

/** Categorías del índice AQI de EE. UU. (EPA). No es la escala IMECA de México. */
export function categoriaAqi(aqi: number): string {
  if (aqi <= 50) return 'Buena'
  if (aqi <= 100) return 'Moderada'
  if (aqi <= 150) return 'Dañina para grupos sensibles'
  if (aqi <= 200) return 'Dañina'
  if (aqi <= 300) return 'Muy dañina'
  return 'Peligrosa'
}

// ───────────── Sismos (Servicio Sismológico Nacional, RSS) ─────────────

export type Sismo = {
  magnitud: number
  lugar: string
  lat: number
  lng: number
  profundidadKm: number | null
  /** Fecha y hora tal como las publica el SSN ("Hora de México"). */
  fechaTexto: string
  /** Instante en milisegundos (se asume UTC−6; México no usa horario de verano desde 2022). */
  instante: number
}

const ENTIDADES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  aacute: 'á',
  eacute: 'é',
  iacute: 'í',
  oacute: 'ó',
  uacute: 'ú',
  ntilde: 'ñ',
  Aacute: 'Á',
  Eacute: 'É',
  Iacute: 'Í',
  Oacute: 'Ó',
  Uacute: 'Ú',
  Ntilde: 'Ñ',
}

function decodificar(texto: string): string {
  return texto.replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, e: string) => {
    if (e.startsWith('#x')) return String.fromCodePoint(parseInt(e.slice(2), 16))
    if (e.startsWith('#')) return String.fromCodePoint(parseInt(e.slice(1), 10))
    return ENTIDADES[e] ?? m
  })
}

const etiqueta = (item: string, nombre: string) =>
  new RegExp(`<${nombre}>([\\s\\S]*?)</${nombre}>`).exec(item)?.[1]

/** Lee el RSS de "últimos sismos" del SSN. Los items mal formados se descartan. */
export function leerSismosSsn(xml: string): Sismo[] {
  if (!xml.includes('<rss')) throw new ErrorEnVivo('El SSN no devolvió un RSS válido')
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1])
  const sismos: Sismo[] = []
  for (const item of items) {
    const titulo = decodificar(etiqueta(item, 'title') ?? '')
    const descripcion = decodificar(etiqueta(item, 'description') ?? '')
    const lat = Number(etiqueta(item, 'geo:lat'))
    const lng = Number(etiqueta(item, 'geo:long'))
    const t = /^\s*([\d.]+)\s*,\s*(.+?)\s*$/.exec(titulo)
    const f = /Fecha:\s*(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})/.exec(descripcion)
    const prof = /Profundidad:\s*([\d.]+)\s*km/.exec(descripcion)
    if (!t || !f || !Number.isFinite(lat) || !Number.isFinite(lng)) continue
    const magnitud = Number(t[1])
    const instante = Date.parse(`${f[1]}T${f[2]}-06:00`)
    if (!Number.isFinite(magnitud) || !Number.isFinite(instante)) continue
    sismos.push({
      magnitud,
      lugar: t[2].replace(/\s+/g, ' '),
      lat,
      lng,
      profundidadKm: prof ? Number(prof[1]) : null,
      fechaTexto: `${f[1]} ${f[2]}`,
      instante,
    })
  }
  if (sismos.length === 0) throw new ErrorEnVivo('No se pudieron leer sismos del SSN')
  return sismos.sort((a, b) => b.instante - a.instante)
}

// ───────────── Utilidades ─────────────

/** Distancia en km entre dos puntos (fórmula de haversine). */
export function distanciaKm([lat1, lng1]: LatLng, [lat2, lng2]: LatLng): number {
  const R = 6371
  const rad = (g: number) => (g * Math.PI) / 180
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** "hace 5 min", "hace 3 h", "hace 2 d". */
export function haceCuanto(instante: number, ahora: number): string {
  const min = Math.max(0, Math.round((ahora - instante) / 60000))
  if (min < 1) return 'justo ahora'
  if (min < 60) return `hace ${min} min`
  if (min < 60 * 24) return `hace ${Math.round(min / 60)} h`
  return `hace ${Math.round(min / 1440)} d`
}

/** De "2026-11-13T17:45" a "17:45". */
export function horaDeIso(iso: string): string {
  return iso.slice(11, 16)
}
