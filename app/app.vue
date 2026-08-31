<!-- app\app.vue -->
<script setup lang="ts">
import { it } from '@nuxt/ui/locale'

const colorMode = useColorMode()
const route = useRoute()

const color = computed(() => colorMode.value === 'dark' ? '#1b1718' : 'white')

useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: color }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'it'
  },
  // Every page-level useSeoMeta({ title }) now sets only its own short name
  // (e.g. "Soci", "Eventi") — this template is what prefixes "Pauperwave | "
  // uniformly, so the browser tab always shows which page it is instead of
  // just the app name.
  titleTemplate: title => title ? `Pauperwave | ${title}` : 'Pauperwave'
})

useSeoMeta({
  description: 'Gestionale della lega Pauper Pauperwave: associati, tornei, leghe, eventi, carte cercate e classifiche.'
})
</script>

<template>
  <!-- Separate from @nuxtjs/i18n's own Italian config (nuxt.config.ts) —
       Nuxt UI has its own locale system for component-internal strings
       (UCalendar month/weekday names, etc.), defaulting to English if
       :locale isn't set here regardless of the rest of the app's language
       (2026-08-23, DateRangePicker.vue's calendar was rendering
       "August" instead of "Agosto"). -->
  <UApp :locale="it">
    <NuxtLoadingIndicator />

    <!-- :key forces a full remount on layout change instead of letting Vue
         patch the previous layout's root node in place — without it, e.g.
         auth.vue's root div (2 children as of the version-badge addition,
         2026-08-30) was getting reused for default.vue's dashboard content
         after login, leaving the sidebar stacked inside auth's centering
         wrapper instead of default's own flex-row shell (bug found
         2026-08-31 via claude-in-chrome on production). -->
    <NuxtLayout :key="String(route.meta.layout ?? 'default')">
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
