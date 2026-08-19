<!-- app\components\associates\fields\ConsentSocialField.vue -->
<!--
  Shared by AddModal.vue and /tesseramento — see PersonalInfoFields.vue for
  the state-mutation rationale (same pattern, `vue/no-mutating-props`
  disabled below for the same reason). Now links to
  /tesseramento/informativa-privacy (2026-08-19, user request — matches
  has_read_statute/consent_data's own link-out-to-the-real-document
  pattern), so still identical in both forms, just no longer plain text.
-->
<!-- eslint-disable vue/no-mutating-props -- see PersonalInfoFields.vue -->
<script setup lang="ts">
interface ConsentSocialState {
  consent_social?: boolean
}

const { state } = defineProps<{ state: ConsentSocialState }>()
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
  <UFormField name="consent_social">
    <UCheckbox
      v-model="state.consent_social"
      :label="$t('associate.addModal.consents.socialLabel')"
      size="lg"
    >
      <template #description>
        <NuxtLink to="/tesseramento/informativa-privacy" target="_blank" class="underline">
          {{ $t('tesseramento.steps.consents.openPrivacy') }}
        </NuxtLink>
      </template>
    </UCheckbox>
  </UFormField>
</template>
