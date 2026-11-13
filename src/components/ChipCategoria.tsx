import { INFO_CATEGORIA } from '../lib/categorias'
import type { Categoria } from '../lib/tipos'

/** Etiqueta de categoría con su color (la información nunca va solo en el color). */
export function ChipCategoria({ categoria }: { categoria: Categoria }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-pill border border-border px-3 py-1 text-small">
      <span
        aria-hidden="true"
        className="size-3 rounded-pill"
        style={{ backgroundColor: `var(--c-cat-${categoria})` }}
      />
      {INFO_CATEGORIA[categoria].etiqueta}
    </span>
  )
}
