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
 * Mismo control en móvil y escritorio: baldosas en dos columnas con casilla.
 * Encendida: fondo de color y palomita. Apagada: sin fondo, casilla vacía y texto tenue.
 */
export function FiltroCategorias({ conteo, apagadas, onAlternar }: Props) {
  return (
    <div
      role="group"
      aria-label="Categorías visibles en el mapa"
      className="grid grid-cols-2 gap-2"
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
            className={`flex min-h-touch items-center gap-2 rounded-control border px-2.5 text-left text-small ${
              encendida
                ? 'border-primary bg-primary-soft text-text'
                : 'border-border border-dashed text-muted'
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex size-4.5 shrink-0 items-center justify-center rounded-[0.3rem] border-2 ${
                encendida ? 'border-primary bg-primary text-on-primary' : 'border-border-strong'
              }`}
            >
              {encendida && (
                <svg viewBox="0 0 12 12" width="10" height="10" fill="none">
                  <path
                    d="M2.5 6.2l2.3 2.3 4.7-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            <span
              aria-hidden="true"
              className={`size-2.5 shrink-0 rounded-pill ${encendida ? '' : 'opacity-40'}`}
              style={{ backgroundColor: `var(--c-cat-${c})` }}
            />
            <span className="min-w-0 flex-1 truncate">{INFO_CATEGORIA[c].etiqueta}</span>
            <span className="text-mini text-muted">{conteo.get(c)}</span>
          </button>
        )
      })}
    </div>
  )
}
