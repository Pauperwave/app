<!-- app\components\events\fields\SchedulingFields.vue -->
<!--
  Events' own version of TournamentsFieldsSchedulingFields.vue (2026-08-22,
  user request — "non permettono di scrivere e modificare l'orario di
  inizio e di fine evento") — same date+start-time+end-time row, minus the
  round-count field (events have no rounds). `startDate` is a separate
  v-model: it's a DateValue (UCalendar's own type), not a plain schema
  field, same reason it's a separate ref in AddModal.vue/EditModal.vue.
-->
<!-- eslint-disable vue/no-mutating-props -- see the comment above -->
<script setup lang="ts">
import { parseTime } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import type { TimeValue } from 'reka-ui'
import type { EventFormState } from '~/composables/events/useEventFormFields'

const { state, formattedStartDate } = defineProps<{
  state: EventFormState
  formattedStartDate: string
}>()

const startDate = defineModel<DateValue>('startDate')

// TimeValue.toString() is "HH:mm:ss" — the form state only ever stores
// "HH:mm", same convention as TournamentsFieldsSchedulingFields.vue's own
// updateTime().
function updateTime(key: 'startTime' | 'endTime', value: TimeValue | null | undefined) {
  if (!value) return
  state[key] = value.toString().slice(0, 5)
}
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
  <div class="flex gap-2">
    <StartDatePickerField
      v-model:start-date="startDate"
      class="flex-1"
      :label="$t('event.addModal.fields.startDate')"
      :formatted-start-date="formattedStartDate"
    />

    <UFormField
      :label="$t('event.addModal.fields.startTime')"
      name="startTime"
      class="w-28 shrink-0"
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
      :label="$t('event.addModal.fields.endTime')"
      name="endTime"
      class="w-28 shrink-0"
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
</template>
