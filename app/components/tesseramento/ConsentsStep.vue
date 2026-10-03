<!-- app\components\tesseramento\ConsentsStep.vue -->
<!-- Extracted from tesseramento/index.vue's `currentStep === 'consents'` step (see
     EmailStep.vue's header for why). `state` is passed straight through to
     AssociatesFieldsConsentsFields, which mutates it (the same reactive object the parent binds
     to its <UForm :state>). -->
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
