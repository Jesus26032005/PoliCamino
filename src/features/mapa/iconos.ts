import { INFO_CATEGORIA } from '../../lib/categorias'
import { leerToken } from '../../lib/tema'
import { CATEGORIAS, type Categoria } from '../../lib/tipos'

const TAM = 40 // px lógicos; se dibuja a 2x para pantallas densas

/** Dibuja un círculo del color de la categoría con su glifo en blanco. */
export function dibujarIcono(categoria: Categoria): ImageData {
  const escala = 2
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = TAM * escala
  const ctx = canvas.getContext('2d')!
  ctx.scale(escala, escala)

  ctx.beginPath()
  ctx.arc(TAM / 2, TAM / 2, TAM / 2 - 2, 0, Math.PI * 2)
  ctx.fillStyle = leerToken(`--c-cat-${categoria}`)
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = '#ffffff'
  ctx.stroke()

  const glifo = 20
  ctx.save()
  ctx.translate((TAM - glifo) / 2, (TAM - glifo) / 2)
  ctx.scale(glifo / 24, glifo / 24)
  ctx.strokeStyle = '#ffffff'
  ctx.fillStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.lineCap = ctx.lineJoin = 'round'
  const path = new Path2D(INFO_CATEGORIA[categoria].icono)
  if (categoria === 'otro') ctx.fill(path)
  else ctx.stroke(path)
  ctx.restore()

  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

export const nombreIcono = (c: Categoria) => `icono-${c}`

/** Registra los íconos de todas las categorías en el mapa (si faltan). */
export function registrarIconos(map: {
  hasImage(id: string): boolean
  addImage(id: string, d: ImageData, o: { pixelRatio: number }): void
}) {
  for (const c of CATEGORIAS) {
    if (!map.hasImage(nombreIcono(c)))
      map.addImage(nombreIcono(c), dibujarIcono(c), { pixelRatio: 2 })
  }
}
