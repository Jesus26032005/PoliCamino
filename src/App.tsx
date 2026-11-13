import { useCallback, useEffect, useMemo, useState } from 'react'
import { NoticeBanner } from './components/NoticeBanner'
import { HojaInferior } from './components/HojaInferior'
import { CAMPUS, CAMPUS_INICIAL } from './data/campus'
import { DetalleLugar } from './features/lugares/DetalleLugar'
import { Mapa } from './features/mapa/Mapa'
import { APP_NAME } from './lib/config'
import { cargarLugares } from './lib/lugares'
import type { Lugar } from './lib/tipos'

type Estado =
  | { fase: 'cargando' }
  | { fase: 'error'; mensaje: string }
  | { fase: 'listo'; lugares: Lugar[] }

export default function App() {
  const campus = CAMPUS[CAMPUS_INICIAL]
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' })
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null)

  useEffect(() => {
    cargarLugares(campus.id)
      .then((lugares) => setEstado({ fase: 'listo', lugares }))
      .catch((e: unknown) =>
        setEstado({
          fase: 'error',
          mensaje: e instanceof Error ? e.message : 'Error desconocido',
        }),
      )
  }, [campus.id])

  const lugares = useMemo(() => (estado.fase === 'listo' ? estado.lugares : []), [estado])
  const seleccionado = lugares.find((l) => l.id === seleccionadoId)
  const cerrar = useCallback(() => setSeleccionadoId(null), [])

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-border bg-surface px-4 py-2">
        <h1 className="text-body font-bold text-primary">{APP_NAME}</h1>
        <span className="text-small text-muted">{campus.nombre}</span>
      </header>
      <NoticeBanner compacto />

      <main className="relative flex-1">
        {estado.fase === 'error' ? (
          <p role="alert" className="p-4">
            No se pudieron cargar los lugares. {estado.mensaje}
          </p>
        ) : (
          <Mapa
            campus={campus}
            lugares={lugares}
            seleccionadoId={seleccionadoId}
            onSeleccionar={setSeleccionadoId}
          />
        )}
        {estado.fase === 'cargando' && (
          <p
            role="status"
            className="absolute left-4 top-4 rounded-control bg-surface px-3 py-2"
          >
            Cargando lugares…
          </p>
        )}
        {seleccionado && (
          <HojaInferior titulo={seleccionado.nombre} onCerrar={cerrar}>
            <DetalleLugar lugar={seleccionado} />
          </HojaInferior>
        )}
      </main>
    </div>
  )
}
