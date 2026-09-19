<!-- app\components\ui\ValueStepper.vue -->
<!--
  Read-only value between a − and a + button: the value can only be changed
  by stepping, never typed, so the parent controls exactly what a step does.
-->
<script setup lang="ts">
const {
  label,
  canDecrease = true,
  canIncrease = true,
  decreaseLabel = undefined,
  increaseLabel = undefined
} = defineProps<{
  label: string
  canDecrease?: boolean
  canIncrease?: boolean
  // Accessible names of the icon-only buttons
  decreaseLabel?: string
  increaseLabel?: string
}>()

const emit = defineEmits<{
  decrease: []
  increase: []
}>()
</script>

<template>
  <div class="flex items-center justify-between rounded-md ring ring-inset ring-accented">
    <UButton
      :icon="ICONS.subtract"
      :disabled="!canDecrease"
      :aria-label="decreaseLabel"
      color="neutral"
      variant="ghost"
      size="sm"
      @click="emit('decrease')"
    />
    <span class="font-mono text-sm tabular-nums">{{ label }}</span>
    <UButton
      :icon="ICONS.add"
      :disabled="!canIncrease"
      :aria-label="increaseLabel"
      color="neutral"
      variant="ghost"
      size="sm"
      @click="emit('increase')"
    />
  </div>
</template>
