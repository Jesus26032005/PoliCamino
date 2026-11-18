import type { VitePWAOptions } from 'vite-plugin-pwa'
import { APP_NAME } from './src/lib/config.ts'

/**
 * PWA: instalable y usable sin conexión.
 *
 * - La app (HTML, JS, CSS, fuentes, íconos) y los datos de lugares y polígonos de cada
 *   campus van precacheados: son parte del build.
 * - Del mapa base solo se guardan las teselas que la persona ya vio, con tope de 1,500.
 *   OpenFreeMap permite uso offline si cada descarga es ≤ 3,000 teselas o 50 MB
 *   (https://openfreemap.org/tos/); aquí nunca se descargan áreas en bloque.
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
    globPatterns: ['**/*.{js,mjs,css,html,svg,png,woff2,txt}'],
    // Subconjuntos de fuentes que el español no usa (el navegador ni los pide).
    globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2'],
    // El chunk del mapa (MapLibre) pesa ~1.1 MB sin comprimir.
    maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
    cleanupOutdatedCaches: true,
    navigateFallback: '/index.html',
    // Las funciones del servidor nunca se responden con la app.
    navigateFallbackDenylist: [/^\/api\//],
    runtimeCaching: [
      {
        // Estilos y descripción del juego de teselas.
        urlPattern: ({ url }) =>
          url.origin === 'https://tiles.openfreemap.org' &&
          (url.pathname.startsWith('/styles/') || url.pathname === '/planet'),
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'mapa-estilos',
          expiration: { maxEntries: 20, maxAgeSeconds: 30 * DIA },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        // Teselas vectoriales que la persona ya vio.
        urlPattern: ({ url }) =>
          url.origin === 'https://tiles.openfreemap.org' &&
          url.pathname.startsWith('/planet/') &&
          url.pathname.endsWith('.pbf'),
        handler: 'CacheFirst',
        options: {
          cacheName: 'mapa-teselas',
          expiration: {
            maxEntries: 1500,
            maxAgeSeconds: 30 * DIA,
            purgeOnQuotaError: true,
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        // Tipografías de etiquetas e íconos del estilo.
        urlPattern: ({ url }) =>
          url.origin === 'https://tiles.openfreemap.org' &&
          (url.pathname.startsWith('/fonts/') || url.pathname.startsWith('/sprites/')),
        handler: 'CacheFirst',
        options: {
          cacheName: 'mapa-recursos',
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 60 * DIA,
            purgeOnQuotaError: true,
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
  devOptions: { enabled: false },
}
