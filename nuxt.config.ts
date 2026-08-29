// https://nuxt.com/docs/api/configuration/nuxt-config
import pkg from './package.json' with { type: 'json' }

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/a11y',
    '@vueuse/nuxt',
    '@pinia/nuxt',
    '@nuxtjs/supabase',
    '@nuxtjs/robots',
    '@nuxt/image',
    '@nuxtjs/i18n',
    '@nuxtjs/device',
    '@nuxtjs/leaflet',
    '@nuxt/hints',
    'motion-v/nuxt',
    'nuxt-echarts',
    '@pinia/colada-nuxt'
  ],
  components: [
    // Auto import components from ~/components/inputs without the 'inputs' prefix
    {
      path: '~/components/inputs',
      pathPrefix: false // This removes the 'inputs' prefix
    },
    // Same as inputs/ — generic single-purpose UI primitives (AddButton,
    // ConfirmModal, ...) with inherently unique names, unlike domain folders
    // (tournaments/, locations/, ...) where AddModal.vue/GridView.vue repeat
    // by design and need the prefix to stay distinguishable.
    {
      path: '~/components/ui',
      pathPrefix: false
    },
    // Preserve the default behavior for other components
    {
      path: '~/components',
      pathPrefix: true
    }
  ],
  imports: {
    // recursively scans all subfolders (e.g. ~/composables/theme, ~/utils/status)
    dirs: ['~/composables/**', '~/utils/**']
  },
  devtools: {
    enabled: true
  },
  css: ['~/assets/css/main.css'],
  site: { indexable: false },
  runtimeConfig: {
    // Server-only — mai esposto al client. Genera il token dal proprio
    // account CardTrader (docs.cardtrader.com/en/docs/api/full/reference);
    // è un JWT permanente (scadenza anno 2126), va trattato come segreto.
    cardTraderApiToken: process.env.CARDTRADER_API_TOKEN,
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      siteName: 'Pauperwave',
      siteDescription: 'The Pauper League Manager',
      appVersion: pkg.version,
      appEnv: process.env.NODE_ENV ?? 'development'
    }
  },
  alias: {
    '#test': '../test'
  },
  routeRules: {
    '/api/**': {
      cors: true
    }
  },
  compatibilityDate: '2024-07-11',
  vite: {
    build: {
      // Disable sourcemaps in production to avoid warnings
      sourcemap: false,
      chunkSizeWarningLimit: 600
    },
    css: {
      devSourcemap: false
    },
    // forza il pre-bundling di queste dipendenze, migliorando l'avvio in dev server
    optimizeDeps: {
      include: [
        'fast-levenshtein', // CJS
        '@vue-flow/core',
        '@vue-flow/background',
        '@vue-flow/controls',
        'vue-draggable-plus',
        'valibot'
      ]
    }
  },
  // Chart types/components registered here are the only ones tree-shaken
  // into the bundle — add to these arrays when a new chart needs a type not
  // listed yet (see MagicTheGathering/league's nuxt.config.ts).
  echarts: {
    renderer: ['svg'],
    charts: ['BarChart', 'PieChart', 'LineChart'],
    components: ['TooltipComponent', 'LegendComponent', 'GridComponent', 'TitleComponent']
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
  // @nuxt/icon's client bundle scan is off by default, so most icons only
  // resolve via a runtime fetch (source of the "[Icon] failed to load icon"
  // warnings) — scanning statically bundles every icon actually referenced
  // in the codebase (including app/utils/icons.ts) instead of the whole
  // lucide/simple-icons/circle-flags collections.
  icon: {
    // Scans source files at build time and inlines every icon used directly
    // into the client JS bundle instead of relying on the runtime fetch.
    // Default globInclude doesn't cover `.ts` — every icon name here lives in
    // app/utils/icons.ts (ICONS.foo string literals), referenced dynamically
    // as :icon="ICONS.foo", never as a literal i-lucide-* string inside a
    // .vue file, so the scanner needs this to actually find them.
    clientBundle: {
      scan: { globInclude: ['**/*.{vue,jsx,tsx,md,mdc,mdx,yml,yaml,ts}'] }
    }
  },
  // Every card/tournament/event image in the app is a Scryfall CDN URL
  // (image_url columns populated from ScryfallApiCard.image_uris.normal, see
  // useScryfallCardSearch.ts) rendered as a plain <img> at whatever size —
  // the same 488×680 "normal" file downloads whether it's a 190px dense
  // tile or a full-width hero (user request, 2026-08-29, "parliamo del
  // caching delle immagini"). Allow-listing the domain here lets <NuxtImg>
  // request an actually-sized/format-converted variant via the built-in ipx
  // provider instead. Swap call sites over incrementally — SelectableImage
  // .vue (wanted-cards grid/dense) is the first, not a repo-wide rewrite.
  image: {
    domains: ['cards.scryfall.io'],
    // Scryfall's CDN rejects requests with a generic/default User-Agent
    // ("Your User-Agent header is currently set to default or generic
    // value.", 400) — Node's fetch (used by ipx's server-side http storage)
    // doesn't set one, unlike a browser, so every /_ipx/ proxy request to
    // Scryfall failed until this was set explicitly (confirmed 2026-08-30
    // via direct Node fetch reproduction).
    ipx: {
      http: {
        fetchOptions: {
          headers: { 'User-Agent': 'Pauperwave (https://app.pauperwave.org)' }
        }
      }
    }
  },
  robots: {
    disallow: ['/']
  },
  supabase: {
    types: '#shared/utils/types/database.ts',
    // redirect: false, // disattiva redirect automatici di Supabase
    redirectOptions: {
      login: '/login',
      callback: '/auth/callback',
      exclude: [
        '/login', '/auth/callback', '/',
        '/tesseramento', '/tesseramento/**',
        '/rankings/cittadino', '/rankings/cittadino/**',
        '/rankings/commander', '/rankings/commander/**',
        '/rankings/premodern', '/rankings/premodern/**',
        '/rankings/pauper', '/rankings/pauper/**',
        '/calendario', '/calendario/**'
      ]
    },
    cookieOptions: {
      domain: '', // lascia vuoto per default (usa il dominio corrente)
      path: '/',
      sameSite: 'lax'
    }
  }
})
