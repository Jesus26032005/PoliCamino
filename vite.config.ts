/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// El SSN solo ofrece HTTP y sin CORS: en desarrollo se reenvía igual que hace api/sismos.ts en producción.
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
  plugins: [react(), tailwindcss()],
  // MapLibre crea su worker con import.meta.url; el prebundle de Vite rompe esa ruta.
  optimizeDeps: { exclude: ['maplibre-gl'] },
  test: {
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      'scripts/**/*.test.ts',
      'api/**/*.test.ts',
      'worker/**/*.test.ts',
    ],
  },
})
