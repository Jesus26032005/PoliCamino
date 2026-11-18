import type { VitePWAOptions } from 'vite-plugin-pwa'
import { APP_NAME } from './src/lib/config.ts'

/**
 * PWA: instalable y usable sin conexión.
 *
 * - La app (HTML, JS, CSS, fuentes, íconos), los datos de lugares y polígonos de cada
 *   campus y los glifos de etiquetas en español van precacheados: son parte del build.
 * - El mapa base es un solo archivo PMTiles servido por el sitio (public/mapa). La app lo
 *   lee y guarda su copia completa en la caché `mapa-base` por su cuenta
 *   (src/features/mapa/mapaOffline.ts y fuenteMapa.ts): el service worker no interviene.
 * - Los datos en vivo (clima, aire, sismos, rutas, ocupación) NO se cachean aquí: si no
 *   hay red se muestra el error de cada sección. La app ya tiene su caché breve propia.
 */
const DIA = 24 * 60 * 60

export const opcionesPWA: Partial<VitePWAOptions> = {
  registerType: 'prompt',
  // Los íconos ya entran por globPatterns; así no se precachean dos veces.
  includeManifestIcons: false,
  manifest: {
    name: `${APP_NAME} · Mapa no oficial del IPN`,
    short_name: APP_NAME,
    description:
      'Mapa no oficial de los campus del Instituto Politécnico Nacional: lugares, cómo llegar, clima y sismos. Proyecto independiente de estudiantes.',
    lang: 'es-MX',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#f6f5f2',
    theme_color: '#8a1c3c',
    categories: ['education', 'navigation'],
    icons: [
      {
        src: '/iconos/icono-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/iconos/icono-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/iconos/maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,mjs,css,html,svg,png,woff2,txt}', 'glifos/*/0-255.pbf'],
    // Subconjuntos de fuentes que el español no usa (el navegador ni los pide).
    globIgnores: [
      '**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2',
      // El mapa base (~4.6 MB) se guarda aparte, con su propia lógica de rangos.
      'mapa/**',
    ],
    // El chunk del mapa (MapLibre) pesa ~1.1 MB sin comprimir.
    maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
    cleanupOutdatedCaches: true,
    navigateFallback: '/index.html',
    // Las funciones del servidor nunca se responden con la app.
    navigateFallbackDenylist: [/^\/api\//],
    runtimeCaching: [
      {
        // Glifos de otros rangos de caracteres (los de español ya van precacheados).
        urlPattern: ({ url, sameOrigin }) =>
          sameOrigin && url.pathname.startsWith('/glifos/'),
        handler: 'CacheFirst',
        options: {
          cacheName: 'mapa-glifos',
          expiration: { maxEntries: 30, maxAgeSeconds: 60 * DIA },
          cacheableResponse: { statuses: [200] },
        },
      },
    ],
  },
  devOptions: { enabled: false },
}
