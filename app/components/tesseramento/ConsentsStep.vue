<!-- app\components\tesseramento\ConsentsStep.vue -->
<!--
  Extracted out of tesseramento/index.vue's `currentStep === 'consents'`
  step (2026-08-16) — see EmailStep.vue's own header for why. `state` is
  passed straight through to AssociatesFieldsConsentsFields, which is the one
  that actually mutates it (same reactive object the parent binds to its own
  <UForm :state>).
-->
<script setup lang="ts">
interface ConsentsStepState {
  has_read_statute?: boolean
  consent_data?: boolean
  consent_social?: boolean
}

defineProps<{ state: ConsentsStepState }>()
</script>

<template>
  <div class="space-y-2">
    <AssociatesFieldsConsentsFields :state="state" />
  </div>
</template>
