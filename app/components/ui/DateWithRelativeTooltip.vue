<!-- app\components\ui\DateWithRelativeTooltip.vue -->
<!--
  Shared "absolute date, relative time on hover" pattern — same
  formatDistanceToNow/it locale already used by DataFreshnessIndicator.vue
  and wantedCardAge.ts, just packaged for direct use in a table cell.
  Renders nothing (not even a dash) when isoString is null/invalid, same as
  the formatDateTime helpers this replaces.
-->
<script setup lang="ts">
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

interface Props {
  isoString?: string | null
  // dd/MM/yyyy HH:mm by default; false for a date-only column (dd/MM/yyyy)
  time?: boolean
}

const { isoString, time = true } = defineProps<Props>()

const date = computed(() => {
  if (!isoString) return null
  try {
    return parseISO(isoString)
  } catch {
    return null
  }
})

const formatted = computed(() => date.value
  ? format(date.value, time ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy')
  : '')

const relative = computed(() => date.value
  ? formatDistanceToNow(date.value, { addSuffix: true, locale: it })
  : '')
</script>

<template>
  <UTooltip v-if="date" :text="relative">
    <span class="cursor-default">{{ formatted }}</span>
  </UTooltip>
</template>
