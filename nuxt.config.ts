// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@nuxtjs/supabase',
    '@nuxt/image',
    '@nuxtjs/i18n'
  ],
  components: [
    // Auto import components from ~/components/inputs without the 'inputs' prefix
    {
      path: '~/components/inputs',
      pathPrefix: false // This removes the 'inputs' prefix
    },
    // Preserve the default behavior for other components
    {
      path: '~/components',
      pathPrefix: true
    }
  ],
  devtools: {
    enabled: true
  },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      siteName: 'PauperWave',
      siteDescription: 'The Pauper League Manager'
    }
  },
  routeRules: {
    '/api/**': {
      cors: true
    }
  },
  compatibilityDate: '2024-07-11',
  // forza il pre-bundling di zod, migliorando l’avvio in dev server
  vite: {
    optimizeDeps: {
      include: ['zod']
    }
  },
  // debug: true,
  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },
  // Single-locale (Italian-only) app — no_prefix means no /it/ URL prefix.
  // Adopted for centralized string management, not for actual multi-language
  // support (same convention as MagicTheGathering/league).
  i18n: {
    locales: [
      { code: 'it', name: 'Italiano', file: 'it.json' }
    ],
    defaultLocale: 'it',
    strategy: 'no_prefix',
    langDir: 'locales/',
    vueI18n: './i18n.config.ts'
  },
  supabase: {
    types: '#shared/utils/types/database.ts',
    // redirect: false, // disattiva redirect automatici di Supabase
    redirectOptions: {
      login: '/login',
      callback: '/auth/callback',
      exclude: ['/login', '/auth/callback', '/']
    },
    cookieOptions: {
      domain: '', // lascia vuoto per default (usa il dominio corrente)
      path: '/',
      sameSite: 'lax'
    }
  }
})
