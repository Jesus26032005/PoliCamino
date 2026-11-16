import type { Campus, CampusId } from '../lib/tipos'

type Props = {
  campus: CampusId
  opciones: Campus[]
  onCambiar: (id: CampusId) => void
  className?: string
}

/** Selector de campus como control segmentado (grupo de opciones excluyentes). */
export function SelectorCampus({ campus, opciones, onCambiar, className = '' }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Campus"
      className={`inline-flex gap-1 rounded-control p-1 ${className}`}
    >
      {opciones.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={c.id === campus}
          onClick={() => onCambiar(c.id)}
          className={`min-h-touch rounded-control px-4 text-small ${
            c.id === campus
              ? 'bg-ink font-semibold text-on-ink'
              : 'font-medium text-muted'
          }`}
        >
          {c.nombre}
        </button>
      ))}
    </div>
  )
}
