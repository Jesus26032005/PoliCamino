import { NoticeBanner } from './components/NoticeBanner'
import { APP_NAME, APP_TAGLINE } from './lib/config'

export default function App() {
  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col gap-6 p-4">
      <header>
        <h1 className="text-title font-bold text-primary">{APP_NAME}</h1>
        <p className="text-muted">{APP_TAGLINE}</p>
      </header>

      <main className="flex-1 rounded-card border border-border bg-surface p-4">
        <p>El mapa de Zacatenco llegará en la Fase 1.</p>
      </main>

      <NoticeBanner />
    </div>
  )
}
