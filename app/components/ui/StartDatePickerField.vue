<!-- app\components\ui\StartDatePickerField.vue -->
<!--
  Shared "start date" UPopover + UCalendar picker, used by events/leagues
  AddModal.vue and tournaments' SchedulingFields.vue (fallow:dupes flagged
  the identical markup across all three — only the field label differs).
  Pair with useStartDateField.ts / useTournamentFormFields.ts for the
  startDate ref + formattedStartDate computed.
-->
<script setup lang="ts">
import type { DateValue } from '@internationalized/date'

const { label } = defineProps<{
  label: string
  formattedStartDate: string
}>()

const startDate = defineModel<DateValue>('startDate')
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
        <UCalendar v-model="startDate" class="p-2" />
      </template>
    </UPopover>
  </UFormField>
</template>
