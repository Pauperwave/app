<!-- app\components\tesseramento\VerifyStep.vue -->
<!-- Extracted out of tesseramento/index.vue's `currentStep === 'verify'`
     step (2026-08-16) — see EmailStep.vue's own header for why. -->
<script setup lang="ts">
defineProps<{
  email: string | undefined
  sendingOtp: boolean
}>()

defineEmits<{ resend: [], back: [] }>()
</script>

<template>
  <div class="flex flex-col items-center gap-4 py-6 text-center">
    <UIcon :name="ICONS.loading" class="animate-spin text-4xl" />
    <p class="text-muted">
      {{ $t('tesseramento.steps.verify.waiting', { email }) }}
    </p>
    <UButton
      :label="$t('tesseramento.steps.verify.resend')"
      variant="link"
      :loading="sendingOtp"
      @click="$emit('resend')"
    />
    <UButton
      :label="$t('tesseramento.back')"
      color="neutral"
      variant="ghost"
      @click="$emit('back')"
    />
  </div>
</template>
