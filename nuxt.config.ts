// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@nuxtjs/supabase',
    '@nuxt/image'
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
    },
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_KEY
  },
  routeRules: {
    '/api/**': {
      cors: true
    }
  },
  compatibilityDate: '2024-07-11',
  // debug: true,
  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    redirect: false, // disattiva redirect automatici di Supabase
    cookieOptions: {
      domain: '', // lascia vuoto per default (usa il dominio corrente)
      path: '/',
      sameSite: 'lax'
    }
  }
})
