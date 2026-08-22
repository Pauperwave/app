<!-- app\components\tournaments\fields\OrganizerDataFields.vue -->
<!--
  Extracted out of AddModal.vue/EditModal.vue (2026-08-16, fallow:dupes
  flagged this block as a 30-line clone) — `state` is the SAME reactive
  object the parent binds to its own <UForm :state>, mutated directly.
-->
<!-- eslint-disable vue/no-mutating-props -- see the comment above -->
<script setup lang="ts">
import type { TournamentFormState } from '~/composables/tournaments/useTournamentFormFields'

interface SelectOption {
  value: string
  label: string
}

const { state, organizerOptions, locationOptions } = defineProps<{
  state: TournamentFormState
  organizerOptions: SelectOption[]
  locationOptions: SelectOption[]
}>()
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
  <div class="grid grid-cols-2 gap-2">
    <UFormField :label="$t('tournament.addModal.fields.organizer')" name="organizerUuid">
      <USelectMenu
        v-model="state.organizerUuid"
        class="w-full"
        :items="organizerOptions"
        value-key="value"
        :placeholder="$t('tournament.addModal.fields.selectOrganizer')"
        :icon="ICONS.player"
      />
    </UFormField>

    <UFormField :label="$t('tournament.addModal.fields.location')" name="locationUuid">
      <USelectMenu
        v-model="state.locationUuid"
        class="w-full"
        :items="locationOptions"
        value-key="value"
        :placeholder="$t('tournament.addModal.fields.selectLocation')"
        :icon="ICONS.mapPin"
      />
    </UFormField>
  </div>
</template>
