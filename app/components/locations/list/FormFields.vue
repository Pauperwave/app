<!-- app\components\locations\list\FormFields.vue -->
<!--
  Extracted out of AddModal.vue/EditModal.vue (fallow:dupes flagged this
  two-column section grid as an identical 21-line block) — `state` is the
  SAME reactive object the parent binds to its own <UForm :state>, mutated
  directly by the field components below, same convention as
  tournaments/fields/SchedulingFields.vue.
-->
<!-- eslint-disable vue/no-mutating-props -- see the comment above -->
<script setup lang="ts">
import type { LocationFormState } from '~/composables/locations/useLocationFormFields'
import type { OpeningHours } from '~/types'

const { state } = defineProps<{ state: LocationFormState }>()

const image = defineModel<string | undefined>('image')
const openingHours = defineModel<OpeningHours>('openingHours', { required: true })
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
  <div class="grid grid-cols-2 gap-x-8 gap-y-6">
    <!-- Left column: general info + position (the map preview makes
         this column naturally taller, so it stays paired with just
         general info rather than also carrying contacts). -->
    <div class="space-y-6">
      <LocationsListFormSection :title="$t('location.addModal.sections.generalInfo')">
        <LocationsFieldsGeneralInfoFields v-model:image="image" :state="state" />
      </LocationsListFormSection>

      <LocationsListFormSection :title="$t('location.addModal.sections.position')">
        <LocationsFieldsPositionFields :state="state" />
      </LocationsListFormSection>
    </div>

    <!-- Right column: contacts + opening hours + social -->
    <div class="space-y-6">
      <LocationsListFormSection :title="$t('location.addModal.sections.contacts')">
        <LocationsFieldsContactFields :state="state" />
      </LocationsListFormSection>

      <LocationsListFormSection :title="$t('location.addModal.sections.openingHours')">
        <LocationsFieldsOpeningHoursFields
          v-model:opening-hours="openingHours"
          :state="state"
        />
      </LocationsListFormSection>

      <LocationsListFormSection :title="$t('location.addModal.sections.social')">
        <LocationsFieldsSocialFields :state="state" />
      </LocationsListFormSection>
    </div>
  </div>
</template>
