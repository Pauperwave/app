<!-- app\components\home\HomeDateRangePicker.vue -->
<script setup lang="ts">
import { DateFormatter, getLocalTimeZone, CalendarDate, today } from '@internationalized/date'
import type { Range } from '~/types'

const df = new DateFormatter('it-IT', {
  dateStyle: 'long'
})

const selected = defineModel<Range>({ required: true })
const { t } = useI18n()

const ranges = computed(() => [
  { label: t('home.dateRanges.lastYear'), years: 1, direction: 'past' as const },
  { label: t('home.dateRanges.last6Months'), months: 6, direction: 'past' as const },
  { label: t('home.dateRanges.last3Months'), months: 3, direction: 'past' as const },
  { label: t('home.dateRanges.lastMonth'), months: 1, direction: 'past' as const },
  { type: 'divider' as const },
  { label: t('home.dateRanges.nextMonth'), months: 1, direction: 'future' as const },
  { label: t('home.dateRanges.next3Months'), months: 3, direction: 'future' as const },
  { label: t('home.dateRanges.next6Months'), months: 6, direction: 'future' as const },
  { label: t('home.dateRanges.nextYear'), years: 1, direction: 'future' as const },
  { type: 'divider' as const },
  { label: t('home.dateRanges.all'), type: 'all' as const }
])

const toCalendarDate = (date: Date) => {
  return new CalendarDate(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  )
}

const calendarRange = computed({
  get: () => ({
    start: selected.value.start ? toCalendarDate(selected.value.start) : undefined,
    end: selected.value.end ? toCalendarDate(selected.value.end) : undefined
  }),
  set: (newValue: { start: CalendarDate | null, end: CalendarDate | null }) => {
    selected.value = {
      start: newValue.start ? newValue.start.toDate(getLocalTimeZone()) : new Date(),
      end: newValue.end ? newValue.end.toDate(getLocalTimeZone()) : new Date()
    }
  }
})

const isRangeSelected = (range: { days?: number, months?: number, years?: number, direction?: 'past' | 'future', type?: 'all' }) => {
  if (!selected.value.start || !selected.value.end) return false

  // Check if "All time" is selected (e.g., a very wide range)
  if (range.type === 'all') {
    // You can define your own logic for what "all" means
    // For example, checking if the range spans more than 10 years
    const diffYears = selected.value.end.getFullYear() - selected.value.start.getFullYear()
    return diffYears >= 10
  }

  const currentDate = today(getLocalTimeZone())
  let startDate = currentDate.copy()
  let endDate = currentDate.copy()

  if (range.direction === 'future') {
    startDate = currentDate
    if (range.days) {
      endDate = endDate.add({ days: range.days })
    } else if (range.months) {
      endDate = endDate.add({ months: range.months })
    } else if (range.years) {
      endDate = endDate.add({ years: range.years })
    }
  } else {
    endDate = currentDate
    if (range.days) {
      startDate = startDate.subtract({ days: range.days })
    } else if (range.months) {
      startDate = startDate.subtract({ months: range.months })
    } else if (range.years) {
      startDate = startDate.subtract({ years: range.years })
    }
  }

  const selectedStart = toCalendarDate(selected.value.start)
  const selectedEnd = toCalendarDate(selected.value.end)

  return selectedStart.compare(startDate) === 0 && selectedEnd.compare(endDate) === 0
}

const selectRange = (range: { days?: number, months?: number, years?: number, direction?: 'past' | 'future', type?: 'all' }) => {
  if (range.type === 'all') {
    // Set a very wide range for "all time"
    // For example: from 10 years ago to 10 years in the future
    const currentDate = today(getLocalTimeZone())
    selected.value = {
      start: currentDate.subtract({ years: 10 }).toDate(getLocalTimeZone()),
      end: currentDate.add({ years: 10 }).toDate(getLocalTimeZone())
    }
    return
  }

  const currentDate = today(getLocalTimeZone())
  let startDate = currentDate.copy()
  let endDate = currentDate.copy()

  if (range.direction === 'future') {
    startDate = currentDate
    if (range.days) {
      endDate = endDate.add({ days: range.days })
    } else if (range.months) {
      endDate = endDate.add({ months: range.months })
    } else if (range.years) {
      endDate = endDate.add({ years: range.years })
    }
  } else {
    endDate = currentDate
    if (range.days) {
      startDate = startDate.subtract({ days: range.days })
    } else if (range.months) {
      startDate = startDate.subtract({ months: range.months })
    } else if (range.years) {
      startDate = startDate.subtract({ years: range.years })
    }
  }

  selected.value = {
    start: startDate.toDate(getLocalTimeZone()),
    end: endDate.toDate(getLocalTimeZone())
  }
}
</script>

<template>
  <UPopover :content="{ align: 'start' }" :modal="true">
    <UButton
      color="neutral"
      variant="ghost"
      :icon="ICONS.calendar"
      class="data-[state=open]:bg-elevated group"
    >
      <span class="truncate">
        <template v-if="selected.start">
          <template v-if="selected.end">
            {{ df.format(selected.start) }} - {{ df.format(selected.end) }}
          </template>
          <template v-else>
            {{ df.format(selected.start) }}
          </template>
        </template>
        <template v-else>
          {{ t('home.pickDate') }}
        </template>
      </span>

      <template #trailing>
        <UIcon :name="ICONS.chevronDown" class="shrink-0 text-dimmed size-5 group-data-[state=open]:rotate-180 transition-transform duration-200" />
      </template>
    </UButton>

    <template #content>
      <div class="flex items-stretch sm:divide-x divide-default">
        <div class="hidden sm:flex flex-col justify-center">
          <template v-for="(range, index) in ranges" :key="index">
            <div v-if="range.type === 'divider'" class="my-1 border-t border-default" />
            <UButton
              v-else
              :label="range.label"
              color="neutral"
              variant="ghost"
              class="rounded-none px-4"
              :class="[isRangeSelected(range) ? 'bg-elevated' : 'hover:bg-elevated/50']"
              truncate
              @click="selectRange(range)"
            />
          </template>
        </div>

        <!-- The variant still not applied, check on the 4.0.2 update -->
        <UCalendar
          v-model="calendarRange"
          variant="subtle"
          color="primary"
          class="p-2"
          :number-of-months="3"
          range
        />
      </div>
    </template>
  </UPopover>
</template>
