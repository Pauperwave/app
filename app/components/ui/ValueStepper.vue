<!-- app\components\ui\ValueStepper.vue -->
<!--
  Read-only value between a − and a + button: the value can only be changed
  by stepping, never typed, so the parent controls exactly what a step does.
  A disabled button can explain why through its hint; each button sits in a
  native span, and a disabled button gets pointer-events-none so the hover reaches that span.
-->
<script setup lang="ts">
const {
  label,
  canDecrease = true,
  canIncrease = true,
  decreaseLabel = undefined,
  increaseLabel = undefined,
  decreaseHint = undefined,
  increaseHint = undefined
} = defineProps<{
  label: string
  canDecrease?: boolean
  canIncrease?: boolean
  // Accessible names of the icon-only buttons
  decreaseLabel?: string
  increaseLabel?: string
  // Why the button is disabled, shown on hover only while it is
  decreaseHint?: string
  increaseHint?: string
}>()

const emit = defineEmits<{
  decrease: []
  increase: []
}>()
</script>

<template>
  <div class="flex items-center justify-between rounded-md ring ring-inset ring-accented">
    <UTooltip
      :text="decreaseHint"
      :disabled="canDecrease || !decreaseHint"
    >
      <span class="inline-flex">
        <UButton
          :icon="ICONS.subtract"
          :disabled="!canDecrease"
          :aria-label="decreaseLabel"
          color="neutral"
          variant="ghost"
          size="sm"
          :class="{ 'pointer-events-none': !canDecrease }"
          @click="emit('decrease')"
        />
      </span>
    </UTooltip>
    <span class="font-mono text-sm tabular-nums">{{ label }}</span>
    <UTooltip
      :text="increaseHint"
      :disabled="canIncrease || !increaseHint"
    >
      <span class="inline-flex">
        <UButton
          :icon="ICONS.add"
          :disabled="!canIncrease"
          :aria-label="increaseLabel"
          color="neutral"
          variant="ghost"
          size="sm"
          :class="{ 'pointer-events-none': !canIncrease }"
          @click="emit('increase')"
        />
      </span>
    </UTooltip>
  </div>
</template>
