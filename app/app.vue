<!-- app\app.vue -->
<script setup lang="ts">
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
  }
})

// Fallback for every page under default.vue's dashboard shell — none of them
// call useSeoMeta themselves (login.vue/tesseramento/404 do, and set their
// own full title). Without this, <head> has no <title> at all on any
// dashboard route.
useSeoMeta({
  title: 'Pauperwave',
  description: 'Gestionale della lega Pauper Pauperwave: associati, tornei, leghe, eventi, carte cercate e classifiche.'
})
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
