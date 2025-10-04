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

// const title = 'Pauperwave Dashboard for Managing Memberships and Tournaments'
// const description = 'A professional dashboard template built with Nuxt UI, featuring multiple pages, data visualization, and comprehensive management capabilities for creating powerful admin interfaces.'
// const url = 'https://www.pauperwave.com/'

// useSeoMeta({
//   title,
//   description,
//   ogTitle: title,
//   ogDescription: description,
//   twitterTitle: title,
//   twitterDescription: description,
//   ogUrl: url,
//   ogImage: 'https://ui.nuxt.com/assets/templates/nuxt/dashboard-light.png',
//   twitterImage: 'https://ui.nuxt.com/assets/templates/nuxt/dashboard-light.png',
//   twitterCard: 'summary_large_image'
// })
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
