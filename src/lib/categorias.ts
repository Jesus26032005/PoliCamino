import type { Categoria } from './tipos'

/** Etiqueta en español e ícono (trazos SVG 24x24, propios) por categoría. */
export const INFO_CATEGORIA: Record<Categoria, { etiqueta: string; icono: string }> = {
  escuela: {
    etiqueta: 'Escuela',
    icono: 'M12 4 2 9l10 5 10-5-10-5z M6 12v4c0 1.5 3 3 6 3s6-1.5 6-3v-4',
  },
  biblioteca: {
    etiqueta: 'Biblioteca',
    icono: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z',
  },
  laboratorio: {
    etiqueta: 'Laboratorio',
    icono: 'M9 3h6 M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3',
  },
  cafeteria: {
    etiqueta: 'Cafetería',
    icono:
      'M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z M17 10h2a2 2 0 0 1 0 4h-2 M7 3v2 M11 3v2',
  },
  servicio: { etiqueta: 'Servicio', icono: 'M12 5v14 M5 12h14' },
  deporte: {
    etiqueta: 'Deporte',
    icono:
      'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18',
  },
  cultura: {
    etiqueta: 'Cultura',
    icono: 'M3 10 12 4l9 6 M5 10v8 M9.5 10v8 M14.5 10v8 M19 10v8 M3 20h18',
  },
  acceso: { etiqueta: 'Acceso', icono: 'M4 12h12 M12 7l5 5-5 5 M20 4v16' },
  transporte: {
    etiqueta: 'Transporte',
    icono:
      'M5 4h14a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1z M4 11h16 M7 21v-3 M17 21v-3',
  },
  baños: {
    etiqueta: 'Baños',
    icono:
      'M12 3.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z M8 21v-9a4 4 0 0 1 8 0v9 M12 12v9',
  },
  otro: { etiqueta: 'Otro', icono: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z' },
}
