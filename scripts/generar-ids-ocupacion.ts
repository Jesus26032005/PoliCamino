/**
 * Genera la lista de lugares que aceptan reportes de ocupación (el Worker rechaza cualquier otro id).
 * Reúne todos los campus que haya en src/data.
 * Uso: npm run generar:ocupacion   (córrelo después de `npm run importar:osm`)
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { admiteOcupacion } from '../src/lib/ocupacion.ts'

type Fila = { id: string; categoria: Parameters<typeof admiteOcupacion>[0] }

const lugares = readdirSync('src/data')
  .filter((f) => f.endsWith('.lugares.json'))
  .flatMap((f) => JSON.parse(readFileSync(`src/data/${f}`, 'utf-8')) as Fila[])
const ids = lugares
  .filter((l) => admiteOcupacion(l.categoria))
  .map((l) => l.id)
  .sort()
writeFileSync('worker/src/ids-ocupacion.json', JSON.stringify(ids, null, 2) + '\n')
console.log(`${ids.length} lugares con ocupación`)
