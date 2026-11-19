import { INFO_CATEGORIA } from '../lib/categorias'
import { CATEGORIAS, type Categoria } from '../lib/tipos'

type Props = {
  /** Lugares por categoría; solo se listan las que tienen al menos uno. */
  conteo: ReadonlyMap<Categoria, number>
  apagadas: ReadonlySet<Categoria>
  onAlternar: (c: Categoria) => void
}

/**
 * Interruptores por categoría (encendida = se ve en el mapa) en forma de píldoras que
 * fluyen en renglones: ocupan la mitad que unas tarjetas y no forman un bloque de color.
 * Encendida: fondo suave y punto de color. Apagada: borde punteado, texto tenue y tachado
 * (el estado nunca depende solo del color).
 */
export function FiltroCategorias({ conteo, apagadas, onAlternar }: Props) {
  return (
    <div
      role="group"
      aria-label="Categorías visibles en el mapa"
      className="flex flex-wrap gap-1.5"
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
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-pill border px-3 text-small ${
              encendida
                ? 'border-transparent bg-soft font-medium text-text'
                : 'border-dashed border-border-strong text-muted line-through'
            }`}
          >
            <span
              aria-hidden="true"
              className={`size-2.5 shrink-0 rounded-pill ${encendida ? '' : 'opacity-35'}`}
              style={{ backgroundColor: `var(--c-cat-${c})` }}
            />
            {INFO_CATEGORIA[c].etiqueta}
            <span className="text-mini text-muted">{conteo.get(c)}</span>
          </button>
        )
      })}
    </div>
  )
}
