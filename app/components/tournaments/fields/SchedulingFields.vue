<!-- app\components\tournaments\fields\SchedulingFields.vue -->
<!-- Extracted from AddModal.vue/EditModal.vue (fallow:dupes flagged a 38-line clone): `state`
     is the SAME reactive object the parent binds to its <UForm :state>, mutated directly.
     `startDate` is a separate v-model: a DateValue (UCalendar's own type), not a plain schema
     field, like the separate ref in both modals. -->
<!-- eslint-disable vue/no-mutating-props -- see the comment above -->
<script setup lang="ts">
import { parseTime } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import type { TimeValue } from 'reka-ui'
import type { TournamentFormState } from '~/composables/tournaments/useTournamentFormFields'
import type { CalendarHighlightedDate } from '~/types'

const { state, formattedStartDate, highlightedDates = [] } = defineProps<{
  state: TournamentFormState
  formattedStartDate: string
  highlightedDates?: CalendarHighlightedDate[]
}>()

const startDate = defineModel<DateValue>('startDate')

// TimeValue.toString() is "HH:mm:ss" — the form state only ever stores "HH:mm",
// same convention as OpeningHoursEditor.vue's updateTime().
function updateTime(
  key: 'startTime' | 'endTime' | 'registrationTime',
  value: TimeValue | null | undefined
) {
  if (!value) return
  state[key] = value.toString().slice(0, 5)
}
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
  <div class="space-y-2">
    <div class="flex gap-2">
      <StartDatePickerField
        v-model:start-date="startDate"
        class="flex-[2]"
        :label="$t('tournament.addModal.fields.startDate')"
        :formatted-start-date="formattedStartDate"
        :highlighted-dates="highlightedDates"
      />

      <UFormField
        :label="$t('tournament.addModal.fields.startTime')"
        name="startTime"
        class="flex-1"
      >
        <UInputTime
          :range="false"
          :hour-cycle="24"
          class="w-full"
          :model-value="state.startTime ? parseTime(state.startTime) : undefined"
          @update:model-value="updateTime('startTime', $event)"
        />
      </UFormField>

      <UFormField
        :label="$t('tournament.addModal.fields.endTime')"
        name="endTime"
        class="flex-1"
      >
        <UInputTime
          :range="false"
          :hour-cycle="24"
          class="w-full"
          :model-value="state.endTime ? parseTime(state.endTime) : undefined"
          @update:model-value="updateTime('endTime', $event)"
        />
      </UFormField>
    </div>

    <div class="flex gap-2">
      <UFormField
        :label="$t('tournament.addModal.fields.registrationTime')"
        name="registrationTime"
        class="flex-1"
      >
        <UInputTime
          :range="false"
          :hour-cycle="24"
          class="w-full"
          :model-value="state.registrationTime ? parseTime(state.registrationTime) : undefined"
          @update:model-value="updateTime('registrationTime', $event)"
        />
      </UFormField>

      <UFormField
        :label="$t('tournament.addModal.fields.roundCount')"
        name="roundCount"
        class="flex-1"
      >
        <UInputNumber
          v-model="state.roundCount"
          :min="1"
          :icon="ICONS.hash"
          class="w-full"
        />
      </UFormField>

      <UFormField
        :label="$t('tournament.addModal.fields.roundDuration')"
        name="roundDurationMinutes"
        class="flex-1"
      >
        <UInputNumber
          v-model="state.roundDurationMinutes"
          :min="10"
          :max="120"
          :step="5"
          :icon="ICONS.timer"
          class="w-full"
        />
      </UFormField>
    </div>
  </div>
</template>
