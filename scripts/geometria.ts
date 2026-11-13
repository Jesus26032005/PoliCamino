/** Geometría mínima en metros (aproximación plana, suficiente para escalas de campus). */
const M_POR_GRADO = 111_320

type Punto = { lat: number; lng: number }

/** Distancia en metros entre dos puntos cercanos. */
export function distanciaMetros(a: Punto, b: Punto): number {
  const k = Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180))
  return Math.hypot((a.lat - b.lat) * M_POR_GRADO, (a.lng - b.lng) * M_POR_GRADO * k)
}

function distanciaASegmento(p: Punto, a: Punto, b: Punto): number {
  const k = Math.cos(p.lat * (Math.PI / 180))
  const x = (q: Punto) => q.lng * M_POR_GRADO * k
  const y = (q: Punto) => q.lat * M_POR_GRADO
  const dx = x(b) - x(a)
  const dy = y(b) - y(a)
  const largo2 = dx * dx + dy * dy
  const t =
    largo2 === 0
      ? 0
      : Math.max(0, Math.min(1, ((x(p) - x(a)) * dx + (y(p) - y(a)) * dy) / largo2))
  return Math.hypot(x(p) - (x(a) + t * dx), y(p) - (y(a) + t * dy))
}

/** ¿El punto está dentro del anillo (polígono cerrado)? */
export function dentroDelAnillo(p: Punto, anillo: Punto[]): boolean {
  let dentro = false
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const a = anillo[i]
    const b = anillo[j]
    if (
      a.lat > p.lat !== b.lat > p.lat &&
      p.lng < ((b.lng - a.lng) * (p.lat - a.lat)) / (b.lat - a.lat) + a.lng
    )
      dentro = !dentro
  }
  return dentro
}

/** Distancia en metros del punto al borde del anillo; 0 si está dentro. */
export function distanciaAlAnillo(p: Punto, anillo: Punto[]): number {
  if (dentroDelAnillo(p, anillo)) return 0
  let mejor = Infinity
  for (let i = 0; i < anillo.length - 1; i++) {
    mejor = Math.min(mejor, distanciaASegmento(p, anillo[i], anillo[i + 1]))
  }
  return mejor
}

/** Distancia del punto al borde, sin importar si está dentro o fuera. */
export function distanciaAlBorde(p: Punto, anillo: Punto[]): number {
  let mejor = Infinity
  for (let i = 0; i < anillo.length - 1; i++) {
    mejor = Math.min(mejor, distanciaASegmento(p, anillo[i], anillo[i + 1]))
  }
  return mejor
}
