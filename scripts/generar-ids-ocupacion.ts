/**
 * Genera la lista de lugares que aceptan reportes de ocupación (el Worker rechaza cualquier otro id).
 * Uso: npm run generar:ocupacion   (córrelo después de `npm run importar:osm`)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { admiteOcupacion } from '../src/lib/ocupacion.ts'

const lugares = JSON.parse(readFileSync('src/data/zacatenco.lugares.json', 'utf-8')) as {
  id: string
  categoria: Parameters<typeof admiteOcupacion>[0]
}[]
const ids = lugares
  .filter((l) => admiteOcupacion(l.categoria))
  .map((l) => l.id)
  .sort()
writeFileSync('worker/src/ids-ocupacion.json', JSON.stringify(ids, null, 2) + '\n')
console.log(`${ids.length} lugares con ocupación`)
