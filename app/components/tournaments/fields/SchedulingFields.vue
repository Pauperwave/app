<!-- app\components\tournaments\fields\SchedulingFields.vue -->
<!--
  Extracted out of AddModal.vue/EditModal.vue (2026-08-16, fallow:dupes
  flagged this block as a 38-line clone) — `state` is the SAME reactive
  object the parent binds to its own <UForm :state>, mutated directly. `startDate`
  is a separate v-model: it's a DateValue (UCalendar's own type), not a plain
  schema field, same reason it's a separate ref in both modals already.
-->
<!-- eslint-disable vue/no-mutating-props -- see the comment above -->
<script setup lang="ts">
import { parseTime } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import type { TimeValue } from 'reka-ui'
import type { TournamentFormState } from '~/composables/tournaments/useTournamentFormFields'

const { state, formattedStartDate } = defineProps<{
  state: TournamentFormState
  formattedStartDate: string
}>()

const startDate = defineModel<DateValue>('startDate')

// TimeValue.toString() is "HH:mm:ss" — the form state only ever stores "HH:mm",
// same convention as OpeningHoursEditor.vue's updateTime().
function updateTime(key: 'startTime' | 'endTime', value: TimeValue | null | undefined) {
  if (!value) return
  state[key] = value.toString().slice(0, 5)
}
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
  <div class="flex gap-4">
    <StartDatePickerField
      v-model:start-date="startDate"
      class="flex-1"
      :label="$t('tournament.addModal.fields.startDate')"
      :formatted-start-date="formattedStartDate"
    />

    <UFormField :label="$t('tournament.addModal.fields.startTime')" name="startTime" class="w-28 shrink-0">
      <UInputTime
        :range="false"
        :hour-cycle="24"
        class="w-full"
        :model-value="state.startTime ? parseTime(state.startTime) : undefined"
        @update:model-value="updateTime('startTime', $event)"
      />
    </UFormField>

    <UFormField :label="$t('tournament.addModal.fields.endTime')" name="endTime" class="w-28 shrink-0">
      <UInputTime
        :range="false"
        :hour-cycle="24"
        class="w-full"
        :model-value="state.endTime ? parseTime(state.endTime) : undefined"
        @update:model-value="updateTime('endTime', $event)"
      />
    </UFormField>

    <UFormField :label="$t('tournament.addModal.fields.roundCount')" name="roundCount" class="w-24 shrink-0">
      <UInputNumber
        v-model="state.roundCount"
        :min="1"
        :icon="ICONS.hash"
      />
    </UFormField>
  </div>
</template>
