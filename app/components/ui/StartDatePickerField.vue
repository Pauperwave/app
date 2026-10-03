<!-- app\components\ui\StartDatePickerField.vue -->
<!-- Shared "start date" UPopover + UCalendar picker, used by tournaments' SchedulingFields.vue
     (events and leagues have no date fields: their dates are derived from their tournaments,
     server/utils/derivedDates.ts). Pair with useStartDateField.ts / useTournamentFormFields.ts
     for the startDate ref + formattedStartDate computed. `highlightedDates` is wired only from
     tournaments (AddModal.vue/EditModal.vue passing existing tournament dates): events/leagues
     omit it, the same no-op-by-omission convention as DateRangePicker.vue's prop. -->
<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import type { CalendarHighlightedDate } from '~/types'

const { label, highlightedDates = [] } = defineProps<{
  label: string
  formattedStartDate: string
  /**
   * Dots specific days with a status-colored UChip + hover tooltip, e.g.
   * tournaments/list/AddModal.vue passing existing tournament dates as a collision/density hint
   * while picking a new date. Omitted entirely (not just empty) by callers that haven't opted in,
   * so it stays a no-op for them.
   */
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
