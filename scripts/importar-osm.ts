/**
 * Importa lugares de OpenStreetMap (Overpass API) para un campus.
 *
 *   npm run importar:osm                  # zacatenco (por defecto)
 *   npm run importar:osm -- santo-tomas   # otro campus (ver scripts/campus-osm.ts)
 *
 * Todo lo importado entra con `verificado: false`: nadie ha confirmado
 * en campo que exista o esté bien ubicado. Se corrige a mano en el JSON.
 * Genera <campus>.lugares.json y <campus>.limite.json en src/data.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import type { CampusId, Lugar } from '../src/lib/tipos.ts'
import { CAMPUS_OSM } from './campus-osm.ts'
import { aliasPara, clasificar, type TagsOSM } from './clasificar.ts'
import { anillosDePoligono, geometriaGeoJSON, type ElementoPoligono } from './poligono.ts'
import {
  construirAccesosYTransporte,
  MAX_METRO_M,
  type ElementoOSM,
} from './transporte.ts'

const ENDPOINT = 'https://overpass-api.de/api/interpreter'
const UA = 'RutaPoli/0.1 (proyecto estudiantil no oficial)'

type Elemento = ElementoOSM & Partial<ElementoPoligono> & { tags?: TagsOSM }

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
  const campusId = (process.argv[2] ?? 'zacatenco') as CampusId
  const origen = CAMPUS_OSM[campusId]
  if (!origen) {
    console.error(
      `Campus desconocido "${campusId}". Opciones: ${Object.keys(CAMPUS_OSM).join(', ')}`,
    )
    process.exit(1)
  }
  console.log(`Importando ${campusId} (OSM ${origen.tipo}/${origen.id})…`)

  // 1) Polígono(s) del campus.
  const [poli] = await overpass(
    `[out:json][timeout:60];${origen.tipo === 'way' ? 'way' : 'rel'}(${origen.id});out geom;`,
  )
  if (!poli) throw new Error(`OSM ${origen.tipo}/${origen.id} no existe`)
  const anillos = anillosDePoligono(poli as ElementoPoligono)
  console.log(`  ${anillos.length} parcela(s) en el polígono`)

  // 2) Todo lo que tiene nombre dentro de alguna parcela.
  const dentro = (filtro: string) =>
    '(' +
    anillos
      .map((a) => `nwr(poly:"${a.map((p) => `${p.lat} ${p.lng}`).join(' ')}")${filtro};`)
      .join('') +
    ');'
  const unicos = (es: Elemento[]) => [
    ...new Map(es.map((e) => [`${e.type}/${e.id}`, e])).values(),
  ]

  const elementos = unicos(
    await overpass(`[out:json][timeout:90];${dentro('["name"]')}out tags center;`),
  )
  const puertas = unicos(
    await overpass(
      `[out:json][timeout:90];${dentro('["barrier"~"^(gate|lift_gate)$"]')}out tags center;`,
    ),
  )

  // 3) Transporte cercano (Metro, estaciones y paradas) en una caja alrededor del campus.
  const grados = MAX_METRO_M / 111_320 + 0.002
  const puntos = anillos.flat()
  const caja = [
    Math.min(...puntos.map((p) => p.lat)) - grados,
    Math.min(...puntos.map((p) => p.lng)) - grados,
    Math.max(...puntos.map((p) => p.lat)) + grados,
    Math.max(...puntos.map((p) => p.lng)) + grados,
  ].join(',')
  const transporte = await overpass(
    `[out:json][timeout:60];(node["highway"="bus_stop"](${caja});nwr["amenity"="bus_station"](${caja});nwr["railway"="station"]["station"="subway"](${caja}););out tags center;`,
  )

  const hoy = new Date().toISOString().slice(0, 10)
  const propio = `${origen.tipo}/${origen.id}`
  const lugares: Lugar[] = []
  for (const e of elementos) {
    if (`${e.type}/${e.id}` === propio) continue // el polígono del campus no es un lugar
    const categoria = clasificar(e.tags ?? {})
    if (!categoria) continue
    const lat = e.lat ?? e.center?.lat
    const lon = e.lon ?? e.center?.lon
    if (lat === undefined || lon === undefined) continue
    const nombre = e.tags!.name.trim()
    const lugar: Lugar = {
      id: `osm-${prefijo[e.type]}${e.id}`,
      campusId,
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
  lugares.push(
    ...construirAccesosYTransporte(puertas, transporte, anillos, hoy, campusId),
  )
  // Sin ids repetidos (un lugar de transporte puede haber salido también por nombre).
  const vistos = new Set<string>()
  const finales = lugares
    .filter((l) => !vistos.has(l.id) && vistos.add(l.id))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es') || a.id.localeCompare(b.id))

  const limite = {
    type: 'Feature',
    properties: {
      nombre: poli.tags?.name,
      fuente: `OpenStreetMap ${propio} (ODbL)`,
      actualizado: hoy,
    },
    geometry: geometriaGeoJSON(anillos),
  }

  mkdirSync('src/data', { recursive: true })
  writeFileSync(
    `src/data/${campusId}.lugares.json`,
    JSON.stringify(finales, null, 2) + '\n',
  )
  writeFileSync(`src/data/${campusId}.limite.json`, JSON.stringify(limite) + '\n')
  // Los aportes de enchufes/silencio viven aparte y nunca se sobrescriben.
  const servicios = `src/data/${campusId}.servicios.json`
  if (!existsSync(servicios)) writeFileSync(servicios, '{}\n')

  console.log(`${finales.length} lugares de ${elementos.length} elementos con nombre`)
  for (const [c, ls] of Object.entries(Object.groupBy(finales, (l) => l.categoria)))
    console.log(`  ${c}: ${ls!.length}`)
  console.log(
    `Caja del polígono (para src/data/campus.ts): lat ${Math.min(...puntos.map((p) => p.lat))}–${Math.max(...puntos.map((p) => p.lat))}, lng ${Math.min(...puntos.map((p) => p.lng))}–${Math.max(...puntos.map((p) => p.lng))}`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
