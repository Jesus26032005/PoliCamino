import { ETIQUETA_ENCHUFES, ETIQUETA_SILENCIO } from '../../lib/servicios'
import type { Atributo, Lugar } from '../../lib/tipos'

function Fila({
  titulo,
  texto,
  a,
}: {
  titulo: string
  texto: string
  a: Atributo<string>
}) {
  return (
    <div>
      <dt className="text-small text-muted">{titulo}</dt>
      <dd>
        {texto}{' '}
        <span className="text-small text-muted">
          · {a.verificado ? 'verificado' : 'sin verificar'} · {a.fuente} · {a.fecha}
        </span>
      </dd>
    </div>
  )
}

/** Enchufes y silencio de un lugar; no muestra nada si nadie ha aportado datos. */
export function ServiciosLugar({ lugar }: { lugar: Lugar }) {
  const s = lugar.servicios
  if (!s?.enchufes && !s?.silencio) return null
  return (
    <dl className="flex flex-col gap-2">
      {s.enchufes && (
        <Fila
          titulo="Enchufes"
          texto={ETIQUETA_ENCHUFES[s.enchufes.valor]}
          a={s.enchufes}
        />
      )}
      {s.silencio && (
        <Fila
          titulo="Ambiente"
          texto={ETIQUETA_SILENCIO[s.silencio.valor]}
          a={s.silencio}
        />
      )}
    </dl>
  )
}
