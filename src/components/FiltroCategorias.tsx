import { INFO_CATEGORIA } from '../lib/categorias'
import { CATEGORIAS, type Categoria } from '../lib/tipos'

type Props = {
  /** Lugares por categoría; solo se listan las que tienen al menos uno. */
  conteo: ReadonlyMap<Categoria, number>
  apagadas: ReadonlySet<Categoria>
  onAlternar: (c: Categoria) => void
}

/**
 * Interruptores por categoría: encendida = se ve en el mapa.
 * En móvil son baldosas en dos columnas; en escritorio, filas con interruptor.
 */
export function FiltroCategorias({ conteo, apagadas, onAlternar }: Props) {
  return (
    <div
      role="group"
      aria-label="Categorías visibles en el mapa"
      className="grid grid-cols-2 gap-2 desk:grid-cols-1 desk:gap-0"
    >
      {CATEGORIAS.filter((c) => conteo.has(c)).map((c) => {
        const encendida = !apagadas.has(c)
        return (
          <button
            key={c}
            type="button"
            role="switch"
            aria-checked={encendida}
            aria-label={`Mostrar ${INFO_CATEGORIA[c].etiqueta} en el mapa (${conteo.get(c)} lugares)`}
            onClick={() => onAlternar(c)}
            className={`flex min-h-touch items-center gap-2.5 rounded-control border px-3 text-left text-small desk:border-transparent desk:bg-transparent desk:px-1 desk:text-body ${
              encendida
                ? 'border-primary bg-primary-soft text-text'
                : 'border-border text-muted'
            }`}
          >
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-pill"
              style={{ backgroundColor: `var(--c-cat-${c})` }}
            />
            <span className="flex-1">{INFO_CATEGORIA[c].etiqueta}</span>
            <span className="text-small text-muted">{conteo.get(c)}</span>
            <span
              aria-hidden="true"
              className={`hidden h-7 w-12 shrink-0 rounded-pill p-1 desk:flex ${
                encendida ? 'justify-end bg-primary' : 'bg-border-strong'
              }`}
            >
              <span className="size-5 rounded-pill bg-on-ink" />
            </span>
          </button>
        )
      })}
    </div>
  )
}
