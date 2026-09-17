<!-- app\components\ui\ImageWithFallback.vue -->
<!-- Ported verbatim from MagicTheGathering/league (user request 2026-09-16:
     copy the vote/commander insertion logic bit-by-bit). -->
<script setup lang="ts">
interface Props {
  src: string | null
  alt: string
  loading?: boolean
}

const { src, alt, loading = false } = defineProps<Props>()
</script>

<template>
  <img
    v-if="src"
    :src="src"
    :alt="alt"
    class="w-full h-full object-cover object-top"
    loading="lazy"
  >
  <div v-else-if="loading" class="flex items-center justify-center h-full">
    <UIcon :name="ICONS.loading" class="animate-spin text-2xl text-muted" />
  </div>
  <div v-else class="flex items-center justify-center h-full text-muted">
    <UIcon :name="ICONS.imageOff" class="text-4xl opacity-30" />
  </div>
</template>
