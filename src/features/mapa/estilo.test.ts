/// <reference types="node" />
import { readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  CAPA_EDIFICIOS_3D,
  crearEstilo,
  FUENTE_BASE,
  RUTA_MAPA,
  TIPOGRAFIAS,
} from './estilo'

const ORIGEN = 'https://rutapoli.example'

describe.each([false, true])('estilo (oscuro: %s)', (oscuro) => {
  const estilo = crearEstilo({ oscuro, origen: ORIGEN })
  const json = JSON.stringify(estilo)

  it('todo se sirve desde el propio sitio (sin servidores de mapas externos)', () => {
    expect(estilo.glyphs).toBe(`${ORIGEN}/glifos/{fontstack}/{range}.pbf`)
    const fuente = estilo.sources[FUENTE_BASE] as { url: string; attribution: string }
    expect(fuente.url).toBe(`pmtiles://${ORIGEN}${RUTA_MAPA}`)
    expect(estilo.sprite).toBeUndefined()
    // Las únicas URLs http(s) del estilo son las del sitio y los enlaces de atribución.
    const urls = json.match(/https?:\/\/[^"'\s{]+/g) ?? []
    for (const u of urls)
      expect(u.startsWith(ORIGEN) || /protomaps\.com|openstreetmap\.org/.test(u), u).toBe(
        true,
      )
  })

  it('atribuye a OpenStreetMap', () => {
    expect((estilo.sources[FUENTE_BASE] as { attribution: string }).attribution).toMatch(
      /OpenStreetMap/,
    )
  })

  it('ninguna capa necesita sprite (íconos ni patrones)', () => {
    for (const c of estilo.layers) {
      const l = (c as { layout?: Record<string, unknown> }).layout ?? {}
      const p = (c as { paint?: Record<string, unknown> }).paint ?? {}
      expect(l['icon-image'], c.id).toBeUndefined()
      expect(p['fill-pattern'], c.id).toBeUndefined()
      expect(p['line-pattern'], c.id).toBeUndefined()
    }
  })

  it('solo usa tipografías que están en public/glifos', () => {
    const usadas = new Set(json.match(/Noto Sans [A-Za-z]+/g))
    const disponibles = new Set(readdirSync('public/glifos'))
    for (const t of usadas) {
      expect(TIPOGRAFIAS as readonly string[], t).toContain(t)
      expect(disponibles.has(t), `falta public/glifos/${t}`).toBe(true)
    }
  })

  it('tiene la capa 3D, oculta por defecto y justo encima de los edificios 2D', () => {
    const ids = estilo.layers.map((c) => c.id)
    const i = ids.indexOf(CAPA_EDIFICIOS_3D)
    expect(i).toBeGreaterThan(0)
    expect(ids[i - 1]).toBe('buildings')
    expect(
      (estilo.layers[i] as { layout: { visibility: string } }).layout.visibility,
    ).toBe('none')
  })
})

describe('estilo con 3D activado', () => {
  it('la capa 3D nace visible', () => {
    const estilo = crearEstilo({ oscuro: false, origen: ORIGEN, tresD: true })
    const capa = estilo.layers.find((c) => c.id === CAPA_EDIFICIOS_3D) as {
      layout: { visibility: string }
    }
    expect(capa.layout.visibility).toBe('visible')
  })
})
