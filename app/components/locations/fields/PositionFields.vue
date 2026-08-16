<!-- app\components\locations\fields\PositionFields.vue -->
<!--
  Shared by AddModal.vue/EditModal.vue — `state` is the SAME reactive object
  the parent binds to its own <UForm :state>, mutated directly (same
  rationale as AssociatesFieldsPersonalInfoFields.vue).
-->
<!-- eslint-disable vue/no-mutating-props -- see the comment above -->
<script setup lang="ts">
import type { LocationFormState } from '~/composables/locations/useLocationFormFields'

const { state } = defineProps<{ state: LocationFormState }>()

// "Via, CAP Città Provincia" — same order as the address line shown on the
// card/table (2026-08-16 user request) — fed to MapPreview.vue, which
// geocodes it via Leaflet/OpenStreetMap (no API key).
const addressLine = computed(() => {
  const parts = [state.address, state.postalCode, state.city, state.province, state.country]
    .filter(Boolean)
  return parts.join(', ')
})
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
  <!-- eslint-disable-next-line -->
  <UFormField :label="$t('location.addModal.fields.address')" name="address" required>
    <UInput
      v-model="state.address"
      class="w-full"
      :placeholder="$t('location.addModal.fields.addressPlaceholder')"
    />
  </UFormField>

  <!-- Via / CAP / Città / Provincia — same order as the composed address
       line elsewhere (2026-08-16 user request). -->
  <div class="grid grid-cols-2 gap-4">
    <!-- eslint-disable-next-line -->
    <UFormField :label="$t('location.addModal.fields.postalCode')" name="postalCode" required>
      <UInput v-model="state.postalCode" class="w-full" />
    </UFormField>

    <!-- eslint-disable-next-line -->
    <UFormField :label="$t('location.addModal.fields.city')" name="city" required>
      <UInput v-model="state.city" class="w-full" />
    </UFormField>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <!-- eslint-disable-next-line -->
    <UFormField :label="$t('location.addModal.fields.province')" name="province" required>
      <UInput v-model="state.province" class="w-full" />
    </UFormField>

    <!-- eslint-disable-next-line -->
    <UFormField :label="$t('location.addModal.fields.country')" name="country" required>
      <UInput v-model="state.country" class="w-full" />
    </UFormField>
  </div>

  <UFormField
    :label="$t('location.addModal.fields.googleMapsUrl')"
    :description="$t('location.addModal.fields.googleMapsUrlHint')"
    name="googleMapsUrl"
  >
    <UInput
      :model-value="state.googleMapsUrl ?? ''"
      class="w-full"
      :icon="ICONS.mapPin"
      :placeholder="$t('location.addModal.fields.googleMapsUrlPlaceholder')"
      @update:model-value="state.googleMapsUrl = ($event as string) || undefined"
    />
  </UFormField>

  <LocationsListMapPreview :address="addressLine" />
</template>
