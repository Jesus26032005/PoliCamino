import type { Campus, CampusId } from '../lib/tipos'

type Props = {
  campus: CampusId
  opciones: Campus[]
  onCambiar: (id: CampusId) => void
}

/** Selector de campus (select nativo: accesible y cómodo en móvil). */
export function SelectorCampus({ campus, opciones, onCambiar }: Props) {
  return (
    <>
      <label htmlFor="selector-campus" className="sr-only">
        Campus
      </label>
      <select
        id="selector-campus"
        value={campus}
        onChange={(e) => onCambiar(e.target.value as CampusId)}
        className="min-h-touch shrink-0 rounded-pill border border-primary bg-surface px-3 text-small font-medium text-text"
      >
        {opciones.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>
    </>
  )
}
