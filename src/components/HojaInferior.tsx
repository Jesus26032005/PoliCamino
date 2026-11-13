import { useEffect, useRef, type ReactNode } from 'react'
import { Boton } from './Boton'

type Props = {
  titulo: string
  onCerrar: () => void
  children: ReactNode
}

/**
 * Hoja que sube desde abajo (patrón móvil). No bloquea el mapa:
 * el foco pasa al título al abrir y Escape la cierra.
 */
export function HojaInferior({ titulo, onCerrar, children }: Props) {
  const tituloRef = useRef<HTMLHeadingElement>(null)

  // El callback se guarda en una ref para no repetir el efecto (y el foco) en cada render.
  const cerrarRef = useRef(onCerrar)
  useEffect(() => {
    cerrarRef.current = onCerrar
  })

  useEffect(() => {
    tituloRef.current?.focus()
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && cerrarRef.current()
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [])

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="hoja-titulo"
      className="absolute inset-x-0 bottom-0 z-10 mx-auto max-h-[55%] w-full max-w-xl overflow-y-auto rounded-t-card border border-b-0 border-border bg-surface p-4 shadow-sheet"
    >
      <div className="flex items-start justify-between gap-2">
        <h2
          id="hoja-titulo"
          ref={tituloRef}
          tabIndex={-1}
          className="text-title font-bold leading-tight outline-none"
        >
          {titulo}
        </h2>
        <Boton onClick={onCerrar} aria-label="Cerrar detalle" className="shrink-0">
          <span aria-hidden="true">✕</span>
        </Boton>
      </div>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  )
}
