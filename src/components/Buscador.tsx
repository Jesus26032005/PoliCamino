import { useId, useMemo, useRef, useState } from 'react'
import { buscar, type IndiceBusqueda } from '../lib/busqueda'
import { INFO_CATEGORIA } from '../lib/categorias'
import type { Lugar } from '../lib/tipos'

type Props = {
  indice: IndiceBusqueda
  onElegir: (lugar: Lugar) => void
  className?: string
}

/** Buscador con lista de resultados (patrón ARIA "combobox con listbox"). */
export function Buscador({ indice, onElegir, className = '' }: Props) {
  const id = useId()
  const listaId = `${id}-lista`
  const entrada = useRef<HTMLInputElement>(null)
  const [consulta, setConsulta] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)

  const resultados = useMemo(() => buscar(indice, consulta), [indice, consulta])
  const hayTexto = consulta.trim() !== ''
  const mostrar = abierto && hayTexto

  function elegir(lugar: Lugar) {
    onElegir(lugar)
    setConsulta(lugar.nombre)
    setAbierto(false)
    entrada.current?.blur()
  }

  function alTeclear(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAbierto(true)
      setActivo((a) => Math.min(a + 1, resultados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActivo((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && mostrar && resultados[activo]) {
      e.preventDefault()
      elegir(resultados[activo])
    } else if (e.key === 'Escape') {
      setAbierto(false)
    }
  }

  return (
    <div role="search" className={`relative ${className}`}>
      <label htmlFor={`${id}-entrada`} className="sr-only">
        Buscar lugar en el campus
      </label>
      <input
        ref={entrada}
        id={`${id}-entrada`}
        type="search"
        role="combobox"
        aria-expanded={mostrar}
        aria-controls={listaId}
        aria-autocomplete="list"
        aria-activedescendant={
          mostrar && resultados[activo] ? `${id}-op-${activo}` : undefined
        }
        autoComplete="off"
        placeholder="Buscar: ESCOM, biblioteca, cafetería…"
        value={consulta}
        onChange={(e) => {
          setConsulta(e.target.value)
          setAbierto(true)
          setActivo(0)
        }}
        onFocus={() => setAbierto(true)}
        onKeyDown={alTeclear}
        className="min-h-touch w-full rounded-control border border-border bg-surface px-4 text-body text-text placeholder:text-muted"
      />

      {mostrar && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-control border border-border bg-surface shadow-sheet">
          <ul id={listaId} role="listbox" aria-label="Resultados">
            {resultados.map((l, i) => (
              <li
                key={l.id}
                id={`${id}-op-${i}`}
                role="option"
                aria-selected={i === activo}
                // onMouseDown evita que el input pierda el foco antes del clic.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir(l)}
                className={`flex min-h-touch cursor-pointer flex-col justify-center px-4 py-2 ${
                  i === activo ? 'bg-bg' : ''
                }`}
              >
                <span>{l.nombre}</span>
                <span className="text-small text-muted">
                  {INFO_CATEGORIA[l.categoria].etiqueta}
                  {l.alias ? ` · ${l.alias.join(', ')}` : ''}
                </span>
              </li>
            ))}
          </ul>
          {resultados.length === 0 && (
            <p role="status" className="px-4 py-3 text-muted">
              Sin resultados para «{consulta.trim()}».
            </p>
          )}
        </div>
      )}
    </div>
  )
}
