<!-- app\components\associates\fields\ConsentSocialField.vue -->
<!-- Shared by AddModal.vue and /tesseramento: see PersonalInfoFields.vue for the state-mutation
     rationale (the same pattern, `vue/no-mutating-props` disabled below for the same reason).
     It links to /tesseramento/informativa-privacy (like has_read_statute/consent_data link out
     to the real document), so it is identical in both forms. -->
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
        <NuxtLink
          to="/tesseramento/informativa-privacy"
          target="_blank"
          class="underline"
        >
          {{ $t('tesseramento.steps.consents.openPrivacy') }}
        </NuxtLink>
      </template>
    </UCheckbox>
  </UFormField>
</template>
