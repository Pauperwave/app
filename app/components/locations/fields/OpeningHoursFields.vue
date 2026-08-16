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
