/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { opcionesPWA } from './pwa.config.ts'

// El SSN solo ofrece HTTP y sin CORS: en desarrollo se reenvía igual que hace functions/api/sismos.ts en producción.
const proxySismos = {
  '/api/sismos': {
    target: 'http://www.ssn.unam.mx',
    changeOrigin: true,
    rewrite: () => '/rss/ultimos-sismos.xml',
  },
}

export default defineConfig({
  server: { proxy: proxySismos },
  preview: { proxy: proxySismos },
  plugins: [react(), tailwindcss(), VitePWA(opcionesPWA)],
  // MapLibre se excluye del prebundle; su worker se registra con setWorkerUrl (Mapa.tsx).
  optimizeDeps: { exclude: ['maplibre-gl'] },
  test: {
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      'scripts/**/*.test.ts',
      'functions/**/*.test.ts',
      'worker/**/*.test.ts',
    ],
  },
})
