import { useId, useMemo, useRef, useState } from 'react'
import { buscar, type IndiceBusqueda } from '../lib/busqueda'
import { INFO_CATEGORIA } from '../lib/categorias'
import type { Lugar } from '../lib/tipos'

type Props = {
  indice: IndiceBusqueda
  onElegir: (lugar: Lugar) => void
  className?: string
  /** Etiqueta accesible (oculta a la vista). */
  etiqueta?: string
  placeholder?: string
  /** Texto con el que arranca el campo; cambia `key` para reiniciarlo. */
  valorInicial?: string
  /** La lista de resultados ocupa espacio en la página en vez de flotar encima. */
  enLinea?: boolean
  /** Campo flotante sobre el mapa (barra superior en móvil). */
  flotante?: boolean
  /** id fijo del campo (para el enlace «Ir al buscador»). */
  idEntrada?: string
  /**
   * La lista flotante se ancla al contenedor posicionado más cercano (la barra superior)
   * en vez de al campo: en móvil usa todo el ancho y los nombres largos no se apilan.
   */
  listaAncha?: boolean
}

/** Buscador con lista de resultados (patrón ARIA "combobox con listbox"). */
export function Buscador({
  indice,
  onElegir,
  className = '',
  etiqueta = 'Buscar lugar en el campus',
  placeholder = 'Buscar: ESCOM, biblioteca, cafetería…',
  valorInicial = '',
  enLinea = false,
  flotante = false,
  idEntrada,
  listaAncha = false,
}: Props) {
  const id = useId()
  const entradaId = idEntrada ?? `${id}-entrada`
  const listaId = `${id}-lista`
  const entrada = useRef<HTMLInputElement>(null)
  const [consulta, setConsulta] = useState(valorInicial)
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
    <div role="search" className={`${listaAncha ? '' : 'relative'} ${className}`}>
      <label htmlFor={entradaId} className="sr-only">
        {etiqueta}
      </label>
      <input
        ref={entrada}
        id={entradaId}
        type="search"
        role="combobox"
        aria-expanded={mostrar}
        aria-controls={listaId}
        aria-autocomplete="list"
        aria-activedescendant={
          mostrar && resultados[activo] ? `${id}-op-${activo}` : undefined
        }
        autoComplete="off"
        placeholder={placeholder}
        value={consulta}
        onChange={(e) => {
          setConsulta(e.target.value)
          setAbierto(true)
          setActivo(0)
        }}
        onFocus={() => setAbierto(true)}
        onKeyDown={alTeclear}
        className={`w-full px-4 text-body text-text placeholder:text-muted ${
          flotante
            ? 'flotante h-control rounded-card'
            : 'min-h-touch rounded-control border border-border-strong bg-soft'
        }`}
      />

      {mostrar && (
        <div
          className={`mt-1 rounded-control border border-border bg-surface ${
            enLinea
              ? 'overflow-hidden'
              : 'absolute inset-x-0 top-full z-30 max-h-[60vh] overflow-y-auto shadow-flotante'
          }`}
        >
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
