import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-05-01',
  devtools: { enabled: true },
  modules: ['nuxt-auth-utils', '@vite-pwa/nuxt'],
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Property CRM',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        {
          name: 'description',
          content:
            'A fast call-list CRM for property agents — track leads, call or WhatsApp in one tap, and never miss a follow-up.',
        },
        { name: 'theme-color', content: '#9e5733' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon-180x180.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap',
        },
      ],
    },
  },
  // PWA update strategy: 'autoUpdate' makes Workbox set skipWaiting + clientsClaim, so a new
  // service worker activates and claims clients automatically — the post-deploy "stale shell"
  // window is minimal and self-heals on the next navigation. 'prompt' is intentionally avoided:
  // it would require users to click to update and could leave them more stale. No navigateFallback
  // (this is an SSR app — navigations must reach the server when online).
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Property CRM',
      short_name: 'Property CRM',
      description:
        'A fast call-list CRM for property agents — track leads, call or WhatsApp in one tap, and never miss a follow-up.',
      lang: 'en',
      theme_color: '#9e5733',
      background_color: '#faf8f4',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      scope: '/',
      icons: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      // Precache the built app shell (JS/CSS/fonts/icons) for fast loads + installability.
      // No navigateFallback: this is an SSR app, so navigations must reach the server when online.
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'google-fonts-stylesheets' },
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-webfonts',
            expiration: { maxEntries: 20, maxAgeSeconds: 31536000 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
    },
    client: { installPrompt: true },
    devOptions: { enabled: false },
  },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    public: {
      // Defines "today" for follow-ups / Due Today, independent of the server clock.
      // Override in production with NUXT_PUBLIC_BUSINESS_TIMEZONE.
      businessTimezone: 'Asia/Kuala_Lumpur',
    },
  },
})
