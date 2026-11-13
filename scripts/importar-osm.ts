/**
 * Importa lugares de OpenStreetMap (Overpass API) para un campus.
 * Uso: npm run importar:osm
 *
 * Todo lo importado entra con `verificado: false`: nadie ha confirmado
 * en campo que exista o esté bien ubicado. Se corrige a mano en el JSON.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { aliasPara, clasificar, type TagsOSM } from './clasificar.ts'
import type { Lugar } from '../src/lib/tipos.ts'
import {
  construirAccesosYTransporte,
  MAX_METRO_M,
  type ElementoOSM,
} from './transporte.ts'

const CAMPUS_ID = 'zacatenco'
const POLIGONO_OSM = 81453020 // way del campus en OSM
const ENDPOINT = 'https://overpass-api.de/api/interpreter'
const UA = 'RutaPoli/0.1 (proyecto estudiantil no oficial)'

type Elemento = {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  geometry?: { lat: number; lon: number }[]
  tags?: TagsOSM
}

async function overpass(consulta: string, intentos = 8): Promise<Elemento[]> {
  for (let i = 0; i < intentos; i++) {
    let motivo: string
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'User-Agent': UA,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ data: consulta }),
      })
      if (res.ok) return ((await res.json()) as { elements: Elemento[] }).elements
      motivo = `respondió ${res.status}`
    } catch (e) {
      motivo = `falló la conexión (${e instanceof Error ? e.message : e})`
    }
    const espera = 10000 * 2 ** Math.min(i, 3)
    console.warn(`Overpass ${motivo}; reintento en ${espera / 1000}s`)
    await new Promise((r) => setTimeout(r, espera))
  }
  throw new Error('Overpass no respondió')
}

const prefijo = { node: 'n', way: 'w', relation: 'r' } as const

async function main() {
  const [poli] = await overpass(
    `[out:json][timeout:25];way(${POLIGONO_OSM});out geom tags;`,
  )
  const anillo = poli.geometry!
  const poly = anillo.map((p) => `${p.lat} ${p.lon}`).join(' ')

  const elementos = await overpass(
    `[out:json][timeout:60];nwr(poly:"${poly}")["name"];out tags center;`,
  )

  // Accesos (puertas sobre el borde) y transporte cercano.
  const puertas = await overpass(
    `[out:json][timeout:60];nwr(poly:"${poly}")["barrier"~"^(gate|lift_gate)$"];out tags center;`,
  )
  const grados = MAX_METRO_M / 111_320 + 0.002
  const lats = anillo.map((p) => p.lat)
  const lons = anillo.map((p) => p.lon)
  const caja = [
    Math.min(...lats) - grados,
    Math.min(...lons) - grados,
    Math.max(...lats) + grados,
    Math.max(...lons) + grados,
  ].join(',')
  const transporte = await overpass(
    `[out:json][timeout:60];(node["highway"="bus_stop"](${caja});nwr["amenity"="bus_station"](${caja});nwr["railway"="station"]["station"="subway"](${caja}););out tags center;`,
  )

  const hoy = new Date().toISOString().slice(0, 10)
  const lugares: Lugar[] = []
  for (const e of elementos) {
    const categoria = clasificar(e.tags ?? {})
    if (!categoria) continue
    const lat = e.lat ?? e.center?.lat
    const lon = e.lon ?? e.center?.lon
    if (lat === undefined || lon === undefined) continue
    const nombre = e.tags!.name.trim()
    const lugar: Lugar = {
      id: `osm-${prefijo[e.type]}${e.id}`,
      campusId: CAMPUS_ID,
      nombre,
      categoria,
      coordenadas: [Number(lat.toFixed(6)), Number(lon.toFixed(6))],
      fuente: `OpenStreetMap ${e.type}/${e.id} (ODbL), consultado ${hoy}`,
      verificado: false,
      osmId: `${e.type}/${e.id}`,
      actualizado: hoy,
    }
    const alias = aliasPara(nombre)
    if (alias) lugar.alias = alias
    lugares.push(lugar)
  }
  const anilloPuntos = anillo.map((p) => ({ lat: p.lat, lng: p.lon }))
  lugares.push(
    ...construirAccesosYTransporte(
      puertas as ElementoOSM[],
      transporte as ElementoOSM[],
      anilloPuntos,
      hoy,
    ),
  )
  lugares.sort(
    (a, b) => a.nombre.localeCompare(b.nombre, 'es') || a.id.localeCompare(b.id),
  )

  const limite = {
    type: 'Feature',
    properties: {
      nombre: poli.tags?.name,
      fuente: `OpenStreetMap way/${POLIGONO_OSM} (ODbL)`,
      actualizado: hoy,
    },
    geometry: { type: 'Polygon', coordinates: [anillo.map((p) => [p.lon, p.lat])] },
  }

  mkdirSync('src/data', { recursive: true })
  writeFileSync(
    `src/data/${CAMPUS_ID}.lugares.json`,
    JSON.stringify(lugares, null, 2) + '\n',
  )
  writeFileSync(`src/data/${CAMPUS_ID}.limite.json`, JSON.stringify(limite) + '\n')

  const porCat = Object.groupBy(lugares, (l) => l.categoria)
  console.log(`${lugares.length} lugares de ${elementos.length} elementos con nombre`)
  for (const [c, ls] of Object.entries(porCat)) console.log(`  ${c}: ${ls!.length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
