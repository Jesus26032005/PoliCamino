import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'primario' | 'suave'
}

const VARIANTES = {
  primario: 'bg-primary text-on-primary',
  suave: 'bg-surface text-text border border-border',
}

/** Botón con objetivo táctil de 48 px. `aria-label` obligatorio si solo lleva ícono. */
export function Boton({
  variante = 'suave',
  className = '',
  type = 'button',
  ...resto
}: Props) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-control px-4 font-medium ${VARIANTES[variante]} ${className}`}
      {...resto}
    />
  )
}
