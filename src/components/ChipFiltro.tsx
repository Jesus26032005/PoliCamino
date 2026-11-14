type Props = {
  etiqueta: string
  cantidad: number
  activo: boolean
  onClick: () => void
}

/** Chip de filtro genérico (alternable) para atributos que no son una categoría. */
export function ChipFiltro({ etiqueta, cantidad, activo, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`inline-flex min-h-touch shrink-0 items-center gap-2 rounded-pill border px-3 text-small ${
        activo
          ? 'border-primary bg-primary text-on-primary'
          : 'border-border bg-surface text-text'
      }`}
    >
      {etiqueta}
      <span className="text-small opacity-80">{cantidad}</span>
    </button>
  )
}
