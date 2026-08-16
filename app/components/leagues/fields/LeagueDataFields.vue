<!-- app\components\leagues\fields\LeagueDataFields.vue -->
<!--
  Extracted out of AddModal.vue so EditModal.vue can share it (2026-08-16,
  same reasoning as tournaments/fields/TournamentDataFields.vue) — `state` is
  the SAME reactive object the parent binds to its own <UForm :state>,
  mutated directly. `startDate` is a separate v-model (a DateValue, not a
  plain schema field), same convention as SchedulingFields.vue.
-->
<!-- eslint-disable vue/no-mutating-props -- see the comment above -->
<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import type { LeagueFormState } from '~/composables/leagues/useLeagueFormFields'

interface SelectOption {
  value: string
  label: string
}

interface StatusOption extends SelectOption {
  icon: string
  color: string
}

const {
  state, statusOptions, rulesetOptions, formattedStartDate
} = defineProps<{
  state: LeagueFormState
  statusOptions: StatusOption[]
  rulesetOptions: SelectOption[]
  formattedStartDate: string
}>()

const startDate = defineModel<DateValue>('startDate')
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
  <UStatusSelect
    v-model="state.status"
    :items="statusOptions"
    name="status"
    :label="$t('league.addModal.fields.status')"
    class="w-full"
  />

  <!-- eslint-disable-next-line -->
  <UFormField :label="$t('league.addModal.fields.name')" name="name" required>
    <UInput
      v-model="state.name"
      class="w-full"
      :placeholder="$t('league.addModal.fields.namePlaceholder')"
      :icon="ICONS.standings"
    />
  </UFormField>

  <div class="grid grid-cols-2 gap-4">
    <StartDatePickerField
      v-model:start-date="startDate"
      :label="$t('event.addModal.fields.startDate')"
      :formatted-start-date="formattedStartDate"
    />

    <UFormField :label="$t('league.addModal.fields.ruleset')" name="rulesetUuid">
      <USelectMenu
        v-model="state.rulesetUuid"
        class="w-full"
        :items="rulesetOptions"
        value-key="value"
        :placeholder="$t('league.addModal.fields.selectRuleset')"
        :icon="ICONS.bookOpen"
      />
    </UFormField>
  </div>
</template>
