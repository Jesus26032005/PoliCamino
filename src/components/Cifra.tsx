/** Dato numérico destacado con su descripción (tarjetas de resumen). */
export function Cifra({ valor, texto }: { valor: string | number; texto: string }) {
  return (
    <div className="rounded-card border border-border bg-soft p-3">
      <p className="font-display text-title font-semibold leading-tight text-primary">
        {valor}
      </p>
      <p className="text-mini text-muted">{texto}</p>
    </div>
  )
}
