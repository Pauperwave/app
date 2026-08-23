<!-- app\components\ui\StartDatePickerField.vue -->
<!--
  Shared "start date" UPopover + UCalendar picker, used by events/leagues
  AddModal.vue and tournaments' SchedulingFields.vue (fallow:dupes flagged
  the identical markup across all three — only the field label differs).
  Pair with useStartDateField.ts / useTournamentFormFields.ts for the
  startDate ref + formattedStartDate computed. `highlightedDates` (issue #37
  follow-up) is wired only from tournaments today (AddModal.vue/EditModal.vue
  passing existing tournament dates) — events/leagues just don't pass it,
  same no-op-by-omission convention as DateRangePicker.vue's own prop.
-->
<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import type { CalendarHighlightedDate } from '~/types'

const { label, highlightedDates = [] } = defineProps<{
  label: string
  formattedStartDate: string
  /** Dots specific days with a status-colored UChip + hover tooltip (issue
   * #37 follow-up, 2026-08-23) — e.g. tournaments/list/AddModal.vue passing
   * existing tournament dates as a collision/density hint while picking a
   * new one's date. Omitted entirely (not just empty) by every caller that
   * hasn't opted in yet, so this stays a no-op for them. */
  highlightedDates?: CalendarHighlightedDate[]
}>()

const startDate = defineModel<DateValue>('startDate')

const toCalendarDate = (date: Date) => new CalendarDate(
  date.getFullYear(),
  date.getMonth() + 1,
  date.getDate()
)

// Same grouping/hover-control pattern as DateRangePicker.vue's own
// highlightedDates — see that file's comment for why the hover listener
// sits on a wrapping `span.contents` rather than directly on `UChip`
// (UChip's inheritAttrs:false silently drops listeners on text-only slot
// content).
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

const hoveredDayKey = ref<string | null>(null)
</script>

<template>
  <UFormField :label="label" name="startDate">
    <UPopover>
      <UInput
        :model-value="formattedStartDate"
        readonly
        class="w-full"
        :icon="ICONS.calendar"
      />

      <template #content>
        <UCalendar v-model="startDate" class="p-2">
          <template #day="{ day }">
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
      </template>
    </UPopover>
  </UFormField>
</template>
