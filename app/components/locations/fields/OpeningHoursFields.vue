<!-- app\components\locations\fields\OpeningHoursFields.vue -->
<!--
  Shared by AddModal.vue/EditModal.vue — `state` is the SAME reactive object
  the parent binds to its own <UForm :state>, mutated directly (same
  rationale as AssociatesFieldsPersonalInfoFields.vue). `openingHours` is a
  separate v-model: kept out of the valibot schema in
  useLocationFormFields.ts, so it isn't part of `state`.
-->
<!-- eslint-disable vue/no-mutating-props -- see the comment above -->
<script setup lang="ts">
import type { LocationFormState } from '~/composables/locations/useLocationFormFields'
import type { OpeningHours } from '~/types'

const { state } = defineProps<{ state: LocationFormState }>()
const openingHours = defineModel<OpeningHours>('openingHours', { default: emptyOpeningHours })

// Clears the hours instead of just disabling the editor (user request,
// 2026-08-19 — previously left in place "for when it reopens", but that
// meant stale hours could get silently saved/shown elsewhere while the
// location is marked closed).
watch(() => state.temporarilyClosed, (closed) => {
  if (closed) openingHours.value = emptyOpeningHours()
})
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
  <UFormField name="temporarilyClosed">
    <UCheckbox
      v-model="state.temporarilyClosed"
      :label="$t('location.addModal.fields.temporarilyClosed')"
      :description="$t('location.addModal.fields.temporarilyClosedHint')"
    />
  </UFormField>

  <LocationsListOpeningHoursEditor
    v-model="openingHours"
    :disabled="!!state.temporarilyClosed"
  />
</template>
