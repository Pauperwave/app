<!-- app\components\tesseramento\RenewalStep.vue -->
<!-- Shown instead of the 9-step application form when tesseramento-status.get.ts
     reports an already-approved associate for this email (user request,
     2026-08-27) — a one-click "conferma rinnovo" rather than re-collecting
     data the associate already gave the first time. -->
<script setup lang="ts">
const { firstName, lastName, confirming = false } = defineProps<{
  firstName: string
  lastName: string
  confirming?: boolean
}>()

defineEmits<{ confirm: [] }>()
</script>

<template>
  <div class="flex flex-col items-center gap-4 py-6 text-center">
    <UIcon :name="ICONS.calendarRenew" class="text-4xl text-primary" />
    <p class="text-highlighted font-medium">
      {{ $t('tesseramento.renewal.greeting', { name: `${firstName} ${lastName}` }) }}
    </p>
    <p class="text-muted">
      {{ $t('tesseramento.renewal.description') }}
    </p>
    <UButton
      :label="$t('tesseramento.renewal.confirm')"
      color="primary"
      :loading="confirming"
      @click="$emit('confirm')"
    />
  </div>
</template>
