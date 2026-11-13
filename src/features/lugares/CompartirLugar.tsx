import { useState } from 'react'
import { Boton } from '../../components/Boton'
import { enlaceDeLugar } from '../../lib/enlaces'
import type { Lugar } from '../../lib/tipos'

/** Comparte `/?lugar=id`: hoja nativa del celular si existe; si no, copia el enlace. */
export function CompartirLugar({ lugar }: { lugar: Lugar }) {
  const [aviso, setAviso] = useState('')

  async function compartir() {
    const url = enlaceDeLugar(lugar.id, window.location)
    try {
      if (navigator.share) {
        await navigator.share({ title: lugar.nombre, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setAviso('Enlace copiado')
    } catch (e) {
      // Cerrar la hoja nativa de compartir lanza AbortError: no es un fallo.
      if (e instanceof DOMException && e.name === 'AbortError') return
      setAviso(`No se pudo copiar. Enlace: ${url}`)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Boton onClick={compartir} className="self-start">
        Compartir enlace
      </Boton>
      <p role="status" className="text-small text-muted">
        {aviso}
      </p>
    </div>
  )
}
