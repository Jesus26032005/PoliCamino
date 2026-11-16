const TRAZOS = {
  buscar: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M20 20l-4-4',
  ubicacion: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v4 M12 18v4 M2 12h4 M18 12h4',
  nube: 'M7 18a4 4 0 0 1 0-8 5.5 5.5 0 0 1 10.6 1.5A3.3 3.3 0 0 1 17 18H7z',
  atras: 'M15 6l-6 6 6 6',
  ruta: 'M6 15.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z M18 3.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z M8.2 18H14a3.5 3.5 0 0 0 0-7h-4a3.5 3.5 0 0 1 0-7h5.8',
  cerrar: 'M6 6l12 12 M18 6L6 18',
} as const

export type NombreIcono = keyof typeof TRAZOS

/** Ícono de trazo propio (24×24). Decorativo: el texto o `aria-label` del botón lo describe. */
export function Icono({ nombre, tam = 22 }: { nombre: NombreIcono; tam?: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={tam}
      height={tam}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d={TRAZOS[nombre]} />
    </svg>
  )
}
