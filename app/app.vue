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
  // just the app name.
  titleTemplate: title => title ? `Pauperwave | ${title}` : 'Pauperwave'
})

useSeoMeta({
  description: 'Gestionale della lega Pauper Pauperwave: associati, tornei, leghe, eventi, carte cercate e classifiche.'
})

// Global developer-view effect (user request, 2026-09-18) — called once
// here rather than from DeveloperViewToggle.vue itself, so the
// .debug-spacing class stays in sync even if that component were ever
// rendered more than once (same "call once" precedent as league's own
// useDeveloperViewOverlay.ts, minus the MutationObserver machinery this
// app doesn't need — .debug-spacing is a pure CSS outline, nothing to
// re-scan on DOM changes). Active only once both isDeveloperView AND
// isOverlayEnabled are on, same two-tier gating as league's own
// overlayActive computed. Wrapped in onMounted, same reason as league's
// own version: `document` doesn't exist during SSR.
const { isDeveloperView, isOverlayEnabled } = useDeveloperView()
const overlayActive = computed(() => isDeveloperView.value && isOverlayEnabled.value)
onMounted(() => {
  watch(overlayActive, (enabled) => {
    document.documentElement.classList.toggle('debug-spacing', enabled)
  }, { immediate: true })
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

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
