<!-- app\components\ui\YearRangePicker.vue -->
<!--
  A year quick-jump USelectMenu paired with an icon-only DateRangePicker,
  gap-2 — extracted out of transactions/index.vue (2026-08-31, user request)
  where this shape first appeared, now also used by associates/index.vue and
  associates/requests.vue. `years` is supplied by the caller (each domain
  computes its own "every year with at least one row, plus the current year"
  list differently — see availableTransactionYears.ts for the shape), this
  component only owns the year<->range two-way sync and the shared layout.
-->
<script setup lang="ts">
import { startOfYear, endOfYear } from 'date-fns'
import type { CalendarHighlightedDate, Range } from '~/types'

const { years, highlightedDates = [] } = defineProps<{
  years: number[]
  highlightedDates?: CalendarHighlightedDate[]
}>()

const range = defineModel<Range>({ required: true })

const yearItems = computed(() => yearSelectItems(years))

// Reads back a year only when `range` currently matches that exact
// calendar-year span (blank otherwise, e.g. after picking an arbitrary range
// from DateRangePicker itself), and writing it sets `range` to that year's
// Jan 1 - Dec 31 — same convention transactions/index.vue had inline.
const selectedYear = computed<number | undefined>({
  get: () => {
    const { start, end } = range.value
    if (!start || !end) return undefined
    const year = start.getFullYear()
    const matchesYear = start.getTime() === startOfYear(new Date(year, 0, 1)).getTime()
      && end.getTime() === endOfYear(new Date(year, 0, 1)).getTime()
    return matchesYear ? year : undefined
  },
  set: (year) => {
    if (year === undefined) return
    range.value = {
      start: startOfYear(new Date(year, 0, 1)),
      end: endOfYear(new Date(year, 0, 1))
    }
  }
})
</script>

<template>
  <div class="flex items-center gap-2">
    <USelectMenu
      v-model="selectedYear"
      :items="yearItems"
      value-key="value"
      :icon="ICONS.calendar"
      class="w-30"
    />

    <DateRangePicker
      v-model="range"
      :highlighted-dates="highlightedDates"
      icon-only
    />
  </div>
</template>
