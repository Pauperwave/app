<!-- app\components\wanted-cards\WantedCardAge.vue -->
<script setup lang="ts">
import type { WantedCardAgeColor } from '~/utils/wantedCardAge'

const { date } = defineProps<{ date: string }>()

const info = computed(() => wantedCardAgeInfo(date))

const DOT_CLASS: Record<WantedCardAgeColor, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error'
}
const TEXT_CLASS: Record<WantedCardAgeColor, string> = {
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error'
}
</script>

<template>
  <span v-if="info" class="flex items-center gap-1.5 text-xs shrink-0" :class="TEXT_CLASS[info.color]">
    <span class="size-1.5 rounded-full shrink-0" :class="DOT_CLASS[info.color]" />
    {{ info.label }}
  </span>
</template>
