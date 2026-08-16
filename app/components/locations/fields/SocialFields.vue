<!-- app\components\locations\fields\SocialFields.vue -->
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
  <UFormField :label="$t('location.addModal.fields.facebook')" name="facebook">
    <UInput
      :model-value="state.facebook ?? ''"
      class="w-full"
      :icon="ICONS.facebook"
      :placeholder="$t('location.addModal.fields.facebookPlaceholder')"
      @update:model-value="state.facebook = ($event as string) || undefined"
    />
  </UFormField>

  <UFormField :label="$t('location.addModal.fields.instagram')" name="instagram">
    <UInput
      :model-value="state.instagram ?? ''"
      class="w-full"
      :icon="ICONS.instagram"
      :placeholder="$t('location.addModal.fields.instagramPlaceholder')"
      @update:model-value="state.instagram = ($event as string) || undefined"
    />
  </UFormField>

  <UFormField :label="$t('location.addModal.fields.telegramChannel')" name="telegramChannel">
    <UInput
      :model-value="state.telegramChannel ?? ''"
      class="w-full"
      :icon="ICONS.telegram"
      :placeholder="$t('location.addModal.fields.telegramChannelPlaceholder')"
      @update:model-value="state.telegramChannel = ($event as string) || undefined"
    />
  </UFormField>

  <UFormField :label="$t('location.addModal.fields.whatsapp')" name="whatsapp">
    <UInput
      :model-value="state.whatsapp ?? ''"
      class="w-full"
      :icon="ICONS.whatsapp"
      :placeholder="$t('location.addModal.fields.whatsappPlaceholder')"
      @update:model-value="state.whatsapp = ($event as string) || undefined"
    />
  </UFormField>
</template>
