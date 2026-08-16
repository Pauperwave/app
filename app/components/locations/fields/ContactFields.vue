<!-- app\components\locations\fields\ContactFields.vue -->
<!--
  Shared by AddModal.vue/EditModal.vue — `state` is the SAME reactive object
  the parent binds to its own <UForm :state>, mutated directly (same
  rationale as AssociatesFieldsPersonalInfoFields.vue).
-->
<!-- eslint-disable vue/no-mutating-props -- see the comment above -->
<script setup lang="ts">
import type { LocationFormState } from '~/composables/locations/useLocationFormFields'

const { state } = defineProps<{ state: LocationFormState }>()
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
  <UFormField :label="$t('location.addModal.fields.phone')" name="phone">
    <UInput
      :model-value="state.phone ?? ''"
      class="w-full"
      :icon="ICONS.phone"
      @update:model-value="state.phone = ($event as string) || undefined"
    />
  </UFormField>

  <UFormField :label="$t('location.addModal.fields.email')" name="email">
    <UInput
      :model-value="state.email ?? ''"
      class="w-full"
      :icon="ICONS.atSign"
      @update:model-value="state.email = ($event as string) || undefined"
    />
  </UFormField>

  <UFormField :label="$t('location.addModal.fields.website')" name="website">
    <UInput
      :model-value="state.website ?? ''"
      class="w-full"
      :icon="ICONS.globe"
      @update:model-value="state.website = ($event as string) || undefined"
    />
  </UFormField>
</template>
