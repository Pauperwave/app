<!-- app\components\locations\fields\GeneralInfoFields.vue -->
<!--
  Shared by AddModal.vue/EditModal.vue — `state` is the SAME reactive object
  the parent binds to its own <UForm :state>, mutated directly (same
  rationale as AssociatesFieldsPersonalInfoFields.vue). `image` is a separate
  v-model: it's kept out of the valibot schema in useLocationFormFields.ts
  (no format validation needed), so it isn't part of `state`.
-->
<!-- eslint-disable vue/no-mutating-props -- see the comment above -->
<script setup lang="ts">
import type { LocationFormState } from '~/composables/locations/useLocationFormFields'

const { state } = defineProps<{ state: LocationFormState }>()
const image = defineModel<string | undefined>('image')
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
  <!-- eslint-disable-next-line -->
  <UFormField :label="$t('location.addModal.fields.name')" name="name" required>
    <UInput
      v-model="state.name"
      class="w-full"
      :placeholder="$t('location.addModal.fields.namePlaceholder')"
      :icon="ICONS.mapPin"
    />
  </UFormField>

  <UFormField :label="$t('location.addModal.fields.image')" name="image">
    <UInput
      :model-value="image ?? ''"
      class="w-full"
      :placeholder="$t('location.addModal.fields.imagePlaceholder')"
      @update:model-value="image = ($event as string) || undefined"
    />
  </UFormField>
</template>
