<!-- app\pages\403.vue -->
<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: t('forbidden.seoTitle'),
  description: t('forbidden.seoDescription')
})
</script>

<template>
  <div class="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
    <UIcon :name="ICONS.lock" class="size-12 text-muted" />

    <div class="flex flex-col gap-1">
      <p class="text-lg font-semibold text-highlighted">
        {{ t('forbidden.title') }}
      </p>
      <p class="text-sm text-muted max-w-sm">
        {{ t('forbidden.description') }}
      </p>
    </div>

    <UButton :label="t('forbidden.backHome')" color="neutral" to="/" />
  </div>
</template>
