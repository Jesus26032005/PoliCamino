import { describe, expect, it } from 'vitest'
import aire from './fixtures/aire.json'
import clima from './fixtures/clima.json'
import ssn from './fixtures/ssn.xml?raw'
import {
  categoriaAqi,
  descripcionClima,
  distanciaKm,
  ErrorEnVivo,
  haceCuanto,
  horaDeIso,
  leerAire,
  leerClima,
  leerSismosSsn,
  urlAire,
  urlClima,
} from './envivo'

// Las muestras en ./fixtures son respuestas reales (13-nov-2026) de Open-Meteo y del SSN.

describe('clima', () => {
  it('lee la respuesta real de Open-Meteo', () => {
    const c = leerClima(clima)
    expect(c).toMatchObject({
      temperaturaC: 15.3,
      sensacionC: 14.3,
      humedadPct: 69,
      codigo: 1,
    })
    expect(horaDeIso(c.hora)).toBe('17:45')
    expect(descripcionClima(c.codigo)).toBe('Mayormente despejado')
  })
  it('rechaza respuestas incompletas o de otro formato', () => {
    for (const mala of [
      null,
      {},
      { current: {} },
      { current: { temperature_2m: 'x' } },
    ]) {
      expect(() => leerClima(mala)).toThrow(ErrorEnVivo)
    }
  })
  it('arma la URL con zona horaria de CDMX', () => {
    const u = urlClima([19.5019, -99.1402])
    expect(u).toContain('latitude=19.5019')
    expect(u).toContain('timezone=America%2FMexico_City')
  })
  it('traduce códigos WMO y no se rompe con desconocidos', () => {
    expect(descripcionClima(0)).toBe('Despejado')
    expect(descripcionClima(95)).toBe('Tormenta eléctrica')
    expect(descripcionClima(123)).toBe('Condición no reconocida')
  })
})

describe('aire', () => {
  it('lee la respuesta real', () => {
    expect(leerAire(aire)).toMatchObject({ usAqi: 74, pm25: 7, pm10: 7.2, ozono: 45 })
    expect(urlAire([19.5, -99.1])).toContain('us_aqi')
  })
  it('rechaza respuestas incompletas', () => {
    expect(() => leerAire({ current: { us_aqi: 10 } })).toThrow(ErrorEnVivo)
  })
  it('categorías del AQI de EE. UU.', () => {
    expect([0, 50, 51, 100, 101, 150, 151, 200, 201, 300, 301].map(categoriaAqi)).toEqual(
      [
        'Buena',
        'Buena',
        'Moderada',
        'Moderada',
        'Dañina para grupos sensibles',
        'Dañina para grupos sensibles',
        'Dañina',
        'Dañina',
        'Muy dañina',
        'Muy dañina',
        'Peligrosa',
      ],
    )
  })
})

describe('sismos (RSS real del SSN)', () => {
  const sismos = leerSismosSsn(ssn)
  it('lee magnitud, lugar, coordenadas, profundidad y fecha', () => {
    expect(sismos).toHaveLength(4)
    const s = sismos.find((x) => x.lugar.includes('PETATLAN') && x.magnitud === 3.8)!
    expect(s).toMatchObject({
      lat: 17.168,
      lng: -101.345,
      profundidadKm: 5,
      fechaTexto: '2026-11-13 04:51:09',
    })
    expect(s.lugar).toBe('41 km al SUR de PETATLAN, GRO') // sin dobles espacios
    expect(new Date(s.instante).toISOString()).toBe('2026-11-13T10:51:09.000Z') // 04:51 en UTC−6
  })
  it('ordena del más reciente al más antiguo', () => {
    const t = sismos.map((s) => s.instante)
    expect(t).toEqual([...t].sort((a, b) => b - a))
  })
  it('descarta items rotos pero conserva los buenos', () => {
    const xml = `<rss><channel><item><title>basura</title></item>${ssn.slice(ssn.indexOf('<item>'), ssn.indexOf('</item>') + 7)}</channel></rss>`
    expect(leerSismosSsn(xml)).toHaveLength(1)
  })
  it('decodifica entidades en el lugar', () => {
    const xml = `<rss><item><title>4.1, 10 km al N de CIUDAD &amp; PE&Ntilde;A, GRO</title><description>Fecha:2026-01-02 03:04:05 (Hora)<br/>Profundidad: 12 km</description><geo:lat>17.0</geo:lat><geo:long>-100.0</geo:long></item></rss>`
    expect(leerSismosSsn(xml)[0].lugar).toBe('10 km al N de CIUDAD & PEÑA, GRO')
  })
  it('falla con claridad si no es RSS o no hay sismos', () => {
    expect(() => leerSismosSsn('<html>error</html>')).toThrow(ErrorEnVivo)
    expect(() => leerSismosSsn('<rss><channel></channel></rss>')).toThrow(ErrorEnVivo)
  })
})

describe('utilidades', () => {
  it('distancia: Zacatenco–Zócalo ≈ 8 km', () => {
    expect(distanciaKm([19.5019, -99.1402], [19.4326, -99.1332])).toBeCloseTo(7.7, 0)
  })
  it('haceCuanto', () => {
    const t = Date.UTC(2026, 0, 1, 12)
    expect(haceCuanto(t, t + 20_000)).toBe('justo ahora')
    expect(haceCuanto(t, t + 25 * 60_000)).toBe('hace 25 min')
    expect(haceCuanto(t, t + 3 * 3_600_000)).toBe('hace 3 h')
    expect(haceCuanto(t, t + 2 * 86_400_000)).toBe('hace 2 d')
  })
})
