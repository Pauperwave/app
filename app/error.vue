<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{
  error: NuxtError
}>()

const { t } = useI18n()

useSeoMeta({
  title: t('errorPage.seoTitle'),
  description: t('errorPage.seoDescription')
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
