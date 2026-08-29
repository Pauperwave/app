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

const { eventsFor, hoveredDayKey } = useCalendarDayHighlights(() => highlightedDates)
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
            <CalendarDayChip
              :day="day"
              :events="eventsFor(day)"
              :hovered="hoveredDayKey === day.toString()"
              @hover="isHovered => hoveredDayKey = isHovered ? day.toString() : null"
            />
          </template>
        </UCalendar>
      </template>
    </UPopover>
  </UFormField>
</template>
