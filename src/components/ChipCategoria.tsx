import { INFO_CATEGORIA } from '../lib/categorias'
import type { Categoria } from '../lib/tipos'

type Props = {
  categoria: Categoria
  /** Número de lugares (solo en modo filtro). */
  cantidad?: number
  /** Con `onClick` el chip es un botón de filtro (alternable). */
  activo?: boolean
  onClick?: () => void
}

/** Etiqueta de categoría con su color (la información nunca va solo en el color). */
export function ChipCategoria({ categoria, cantidad, activo = false, onClick }: Props) {
  const contenido = (
    <>
      <span
        aria-hidden="true"
        className="size-3 shrink-0 rounded-pill border border-surface"
        style={{ backgroundColor: `var(--c-cat-${categoria})` }}
      />
      {INFO_CATEGORIA[categoria].etiqueta}
      {cantidad !== undefined && (
        <span className="text-small opacity-80">{cantidad}</span>
      )}
    </>
  )
  const base = 'inline-flex items-center gap-2 rounded-pill border px-3 text-small'

  if (!onClick) return <span className={`${base} border-border py-1`}>{contenido}</span>

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`${base} min-h-touch shrink-0 ${
        activo
          ? 'border-primary bg-primary text-on-primary'
          : 'border-border bg-surface text-text'
      }`}
    >
      {contenido}
    </button>
  )
}
