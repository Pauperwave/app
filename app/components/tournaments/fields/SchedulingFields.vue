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
import type { DateValue } from '@internationalized/date'
import type { TournamentFormState } from '~/composables/tournaments/useTournamentFormFields'

const { state, formattedStartDate } = defineProps<{
  state: TournamentFormState
  formattedStartDate: string
}>()

const startDate = defineModel<DateValue>('startDate')
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
  <div class="grid grid-cols-2 gap-4">
    <div class="flex justify-between gap-2">
      <UFormField :label="$t('tournament.addModal.fields.startDate')" class="flex-1" name="startDate">
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

      <UFormField :label="$t('tournament.addModal.fields.startTime')" name="startTime">
        <UTimePicker
          v-model="state.startTime"
          :placeholder="$t('tournament.addModal.fields.selectTime')"
          :minute-step="15"
        />
      </UFormField>
    </div>

    <UFormField :label="$t('tournament.addModal.fields.roundCount')" name="roundCount">
      <UInputNumber
        v-model="state.roundCount"
        :min="1"
        :icon="ICONS.hash"
      />
    </UFormField>
  </div>
</template>
