<!-- app\components\ui\DateRangePicker.vue -->
<script setup lang="ts">
import {
  DateFormatter, getLocalTimeZone, CalendarDate, today
} from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import type { CalendarHighlightedDate, Range } from '~/types'

const df = new DateFormatter('it-IT', {
  dateStyle: 'long'
})

interface Props {
  /** Dots specific days with a status-colored UChip + hover tooltip (issue
   * #37) — see CalendarHighlightedDate. Omitted entirely (not just empty)
   * by every caller that hasn't opted in yet, so this stays a no-op. */
  highlightedDates?: CalendarHighlightedDate[]
  /** Absolute calendar-year presets (Jan 1 - Dec 31 of that year), prepended
   * above the relative "last/next N" ones. Opt-in per caller (transactions,
   * whose data is naturally year-bucketed) — omitted entirely by every other
   * page, same convention as highlightedDates. */
  calendarYears?: number[]
  /** Always icon-only regardless of viewport, instead of showing the
   * formatted range as the button's own label — opt-in for pages crowded
   * enough that the range text itself doesn't fit (transactions/index.vue,
   * user request, 2026-08-27). The range is still readable via tooltip. */
  iconOnly?: boolean
}

const { highlightedDates = [], calendarYears = [], iconOnly = false } = defineProps<Props>()

const selected = defineModel<Range>({ required: true })
const { t } = useI18n()

const rangeLabel = computed(() => {
  if (!selected.value.start) return t('home.pickDate')
  if (!selected.value.end) return df.format(selected.value.start)
  return `${df.format(selected.value.start)} - ${df.format(selected.value.end)}`
})

const ranges = computed(() => [
  ...calendarYears.map(year => ({ label: String(year), year, type: undefined })),
  ...(calendarYears.length ? [{ type: 'divider' as const }] : []),
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

interface RangeSpec {
  days?: number
  months?: number
  years?: number
  direction?: 'past' | 'future'
  type?: 'all'
  /** Absolute calendar year (Jan 1 - Dec 31), unrelated to `years`/`direction`
   * which are both relative to today. */
  year?: number
}

function calendarYearRange(year: number): { startDate: CalendarDate, endDate: CalendarDate } {
  return { startDate: new CalendarDate(year, 1, 1), endDate: new CalendarDate(year, 12, 31) }
}

// isRangeSelected/selectRange both need "what CalendarDate span does this preset
// mean, from today" — this is that computation, shared instead of duplicated.
function rangeDatesFromToday(range: RangeSpec): { startDate: CalendarDate, endDate: CalendarDate } {
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

  return { startDate, endDate }
}

const isRangeSelected = (range: RangeSpec) => {
  if (!selected.value.start || !selected.value.end) return false

  // Check if "All time" is selected (e.g., a very wide range)
  if (range.type === 'all') {
    // You can define your own logic for what "all" means
    // For example, checking if the range spans more than 10 years
    const diffYears = selected.value.end.getFullYear() - selected.value.start.getFullYear()
    return diffYears >= 10
  }

  const { startDate, endDate } = range.year !== undefined
    ? calendarYearRange(range.year)
    : rangeDatesFromToday(range)
  const selectedStart = toCalendarDate(selected.value.start)
  const selectedEnd = toCalendarDate(selected.value.end)

  return selectedStart.compare(startDate) === 0 && selectedEnd.compare(endDate) === 0
}

// CalendarDate#toString() is already a "YYYY-MM-DD" key, same format the
// #day slot's own `day` param produces — cheaper than a per-day .some() scan
// once highlightedDates gets into the dozens (all of a domain's tournaments).
// Grouped (not deduped) per day: the tooltip lists every event on a day with
// more than one, even though the dot itself can only show one color (the
// last entry's, same as before).
const highlightedDatesByDay = computed(() => {
  const map = new Map<string, CalendarHighlightedDate[]>()
  for (const entry of highlightedDates) {
    const key = toCalendarDate(entry.date).toString()
    map.set(key, [...(map.get(key) ?? []), entry])
  }
  return map
})

function eventsFor(day: DateValue): CalendarHighlightedDate[] {
  return highlightedDatesByDay.value.get(day.toString()) ?? []
}

// UTooltip's own pointerenter-based auto-open never fires here — not a
// reka-ui range-mode pointer conflict as first suspected, but UChip itself:
// it declares inheritAttrs:false and forwards $attrs into its default
// slot's content (asChild Slot), which is bare text (day.day) here, not an
// element, so a listener put directly on <UChip> silently attaches to
// nothing (see node_modules/@nuxt/ui/dist/runtime/components/Chip.vue).
// Controlling `open` ourselves off native @mouseenter/@mouseleave on a
// wrapping `span.contents` (in the template below, not on UChip) sidesteps
// that entirely.
const hoveredDayKey = ref<string | null>(null)

const selectRange = (range: RangeSpec) => {
  const currentDate = today(getLocalTimeZone())

  if (range.type === 'all') {
    // Set a very wide range for "all time"
    // For example: from 10 years ago to 10 years in the future
    selected.value = {
      start: currentDate.subtract({ years: 10 }).toDate(getLocalTimeZone()),
      end: currentDate.add({ years: 10 }).toDate(getLocalTimeZone())
    }
    return
  }

  const { startDate, endDate } = range.year !== undefined
    ? calendarYearRange(range.year)
    : rangeDatesFromToday(range)
  selected.value = {
    start: startDate.toDate(getLocalTimeZone()),
    end: endDate.toDate(getLocalTimeZone())
  }
}
</script>

<template>
  <UPopover :content="{ align: 'start' }" :modal="true">
    <UTooltip v-if="iconOnly" :text="rangeLabel">
      <UButton
        color="neutral"
        variant="ghost"
        :icon="ICONS.calendar"
        :aria-label="rangeLabel"
        class="data-[state=open]:bg-elevated"
      />
    </UTooltip>
    <UButton
      v-else
      color="neutral"
      variant="ghost"
      :icon="ICONS.calendar"
      class="data-[state=open]:bg-elevated group"
    >
      <span class="truncate">{{ rangeLabel }}</span>

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
        >
          <template #day="{ day }">
            <!-- The hover listeners live on this plain `contents` span, not
                 on UChip: UChip declares `inheritAttrs: false` and forwards
                 its own $attrs into the default slot's content (reka-ui's
                 asChild `Slot`) — since that content here is bare text
                 (`day.day`), not an element, any listener put directly on
                 `<UChip>` silently attaches to nothing. `display: contents`
                 keeps this span out of the cell's layout/sizing. -->
            <span
              class="contents"
              @mouseenter="hoveredDayKey = eventsFor(day).length ? day.toString() : null"
              @mouseleave="hoveredDayKey = null"
            >
              <UTooltip
                v-if="eventsFor(day).length"
                :text="eventsFor(day).map(event => event.label).join('\n')"
                :ui="{ text: 'whitespace-pre-line' }"
                :open="hoveredDayKey === day.toString()"
              >
                <UChip :color="eventsFor(day).at(-1)!.color" size="xs" position="top-right">
                  {{ day.day }}
                </UChip>
              </UTooltip>
              <UChip
                v-else
                :show="false"
                size="xs"
                position="top-right"
              >
                {{ day.day }}
              </UChip>
            </span>
          </template>
        </UCalendar>
      </div>
    </template>
  </UPopover>
</template>
