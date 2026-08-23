<!-- app\app.vue -->
<script setup lang="ts">
import { it } from '@nuxt/ui/locale'

const colorMode = useColorMode()

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
  // just the app name (previously every page fell back to the bare
  // "Pauperwave" below, since none of them set a title of their own).
  titleTemplate: title => title ? `Pauperwave | ${title}` : 'Pauperwave'
})

// Fallback for every page under default.vue's dashboard shell that doesn't
// (yet) set its own title — without this, <head> has no <title> at all on
// those routes.
useSeoMeta({
  description: 'Gestionale della lega Pauper Pauperwave: associati, tornei, leghe, eventi, carte cercate e classifiche.'
})
</script>

<template>
  <!-- Separate from @nuxtjs/i18n's own Italian config (nuxt.config.ts) —
       Nuxt UI has its own locale system for component-internal strings
       (UCalendar month/weekday names, etc.), defaulting to English if
       :locale isn't set here regardless of the rest of the app's language
       (2026-08-23, HomeDateRangePicker.vue's calendar was rendering
       "August" instead of "Agosto"). -->
  <UApp :locale="it">
    <NuxtLoadingIndicator />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
