import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-05-01',
  devtools: { enabled: true },
  modules: ['nuxt-auth-utils'],
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Property CRM',
      meta: [
        {
          name: 'description',
          content:
            'A fast call-list CRM for property agents — track leads, call or WhatsApp in one tap, and never miss a follow-up.',
        },
        { name: 'theme-color', content: '#0d121c' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap',
        },
      ],
    },
  },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
  },
})
