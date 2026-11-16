import type { KeyboardEvent, ReactNode } from 'react'
import { useEsEscritorio } from '../lib/pantalla'

/** Altura de la hoja inferior en móvil. En escritorio no aplica (panel lateral fijo). */
export type EstadoHoja = 'min' | 'medio' | 'max'

type Props<T extends string> = {
  pestanas: readonly { id: T; etiqueta: string }[]
  activa: T
  onPestana: (id: T) => void
  estado: EstadoHoja
  onEstado: (e: EstadoHoja) => void
  children: ReactNode
}

const SIGUIENTE: Record<EstadoHoja, EstadoHoja> = {
  min: 'medio',
  medio: 'max',
  max: 'min',
}
const ACCION: Record<EstadoHoja, string> = {
  min: 'Abrir panel',
  medio: 'Expandir panel',
  max: 'Contraer panel',
}

/**
 * Contenedor principal de contenido: panel lateral en escritorio y hoja inferior
 * de tres alturas en móvil (los tamaños viven en `.panel`, en index.css).
 */
export function Panel<T extends string>({
  pestanas,
  activa,
  onPestana,
  estado,
  onEstado,
  children,
}: Props<T>) {
  const escritorio = useEsEscritorio()
  const oculto = !escritorio && estado === 'min'

  function alTeclear(e: KeyboardEvent) {
    const paso = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!paso) return
    e.preventDefault()
    const i = pestanas.findIndex((p) => p.id === activa)
    const destino = pestanas[(i + paso + pestanas.length) % pestanas.length]
    onPestana(destino.id)
    document.getElementById(`pestana-${destino.id}`)?.focus()
  }

  return (
    <section className="panel" data-estado={estado} aria-label="Panel de información">
      <button
        type="button"
        onClick={() => onEstado(SIGUIENTE[estado])}
        aria-label={ACCION[estado]}
        className="flex h-6 shrink-0 items-center justify-center desk:hidden"
      >
        <span className="h-1.5 w-10 rounded-pill bg-border-strong" />
      </button>

      <div
        role="tablist"
        aria-label="Secciones"
        onKeyDown={alTeclear}
        className="flex shrink-0 gap-1 border-b border-border px-2.5 pb-2.5 desk:pt-2.5"
      >
        {pestanas.map((p) => (
          <button
            key={p.id}
            id={`pestana-${p.id}`}
            type="button"
            role="tab"
            aria-selected={p.id === activa}
            aria-controls="panel-contenido"
            tabIndex={p.id === activa ? 0 : -1}
            onClick={() => onPestana(p.id)}
            className={`min-h-touch flex-1 rounded-control px-2 text-small ${
              p.id === activa
                ? 'bg-primary-soft font-semibold text-primary'
                : 'font-medium text-muted'
            }`}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      <div
        id="panel-contenido"
        role="tabpanel"
        aria-labelledby={`pestana-${activa}`}
        inert={oculto}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 desk:p-5"
      >
        {children}
      </div>
    </section>
  )
}
