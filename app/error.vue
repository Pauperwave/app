<!-- app\error.vue -->
<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{
  error: NuxtError
}>()

const { t } = useI18n()

useSeoMeta({
  title: t('error.seoTitle'),
  description: t('error.seoDescription')
})

useHead({
  htmlAttrs: {
    lang: 'it'
  }
})
</script>

<template>
  <UApp>
    <UError :error="error" />
  </UApp>
</template>
