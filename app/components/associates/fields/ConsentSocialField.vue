<!-- app\components\associates\fields\ConsentSocialField.vue -->
<!--
  Shared by AddModal.vue and /tesseramento — see PersonalInfoFields.vue for
  the state-mutation rationale (same pattern, `vue/no-mutating-props`
  disabled below for the same reason). Unlike has_read_statute/consent_data,
  this checkbox's description is identical in both forms (no external link),
  so the whole field is shared rather than just the input.
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
        {{ $t('associate.addModal.consents.socialDescription') }}
      </template>
    </UCheckbox>
  </UFormField>
</template>
