import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'primario' | 'suave' | 'relleno' | 'flotante'
}

const VARIANTES = {
  primario: 'bg-primary text-on-primary',
  /** Contorno sobre el panel. */
  suave: 'border border-border-strong bg-transparent text-text',
  /** Relleno sutil, sin borde. */
  relleno: 'bg-soft text-text',
  /** Sobre el mapa. */
  flotante: 'flotante text-text',
}

/** Botón con objetivo táctil de 44 px o más. `aria-label` obligatorio si solo lleva ícono. */
export function Boton({
  variante = 'suave',
  className = '',
  type = 'button',
  ...resto
}: Props) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-control px-4 font-medium disabled:opacity-60 ${VARIANTES[variante]} ${className}`}
      {...resto}
    />
  )
}
