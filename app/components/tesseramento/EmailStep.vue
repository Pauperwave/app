<!-- app\components\tesseramento\EmailStep.vue -->
<!--
  Extracted out of tesseramento/index.vue's `currentStep === 'email'` step
  (2026-08-16, fallow:health flagged the page's whole <template> as
  high-complexity) — the other mid-wizard steps (associateType, personalInfo,
  birthInfo, fiscalInfo, residencyInfo) each just wrap an existing
  AssociatesFields*.vue component in 1-4 lines, not worth a second wrapper;
  this step and VerifyStep.vue/ConsentsStep.vue carry real markup of their
  own.

  `state` is the SAME reactive object the parent binds to its own
  <UForm :state>, mutated directly — same convention as
  tournaments/fields/SchedulingFields.vue.
-->
<!-- eslint-disable vue/no-mutating-props -- see the comment above -->
<script setup lang="ts">
interface EmailStepState {
  email_address?: string
}

const { state } = defineProps<{
  state: EmailStepState
  sendingOtp: boolean
}>()

defineEmits<{ sendOtp: [] }>()
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
  <UFormField :label="$t('tesseramento.steps.email.label')" name="email_address" required>
    <UInput
      v-model="state.email_address"
      type="email"
      autocomplete="email"
      :icon="ICONS.atSign"
      :placeholder="$t('tesseramento.steps.email.placeholder')"
      class="w-full"
    />
  </UFormField>

  <div class="flex justify-end">
    <UButton
      :label="$t('tesseramento.steps.email.submit')"
      color="primary"
      :loading="sendingOtp"
      @click="$emit('sendOtp')"
    />
  </div>
</template>
