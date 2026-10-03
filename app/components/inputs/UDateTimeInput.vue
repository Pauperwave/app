<!-- app\components\inputs\UDateTimeInput.vue -->
<script setup lang="ts">
import type { CalendarDateTime } from '@internationalized/date'

interface Props {
  granularity?: 'day' | 'hour' | 'minute' | 'second'
  hourCycle?: 12 | 24
}

// 24-hour clock by default: Nuxt UI's UInputDate defaults to a 12-hour AM/PM picker. Other
// UInputDate props (class, disabled, size, ...) fall through since this component has a single root
// node
const {
  granularity = 'minute',
  hourCycle = 24
} = defineProps<Props>()

const model = defineModel<CalendarDateTime>()
</script>

<template>
  <UInputDate
    v-model="model"
    :granularity="granularity"
    :hour-cycle="hourCycle"
  />
</template>
