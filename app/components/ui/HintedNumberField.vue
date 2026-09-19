<!-- app\components\ui\HintedNumberField.vue -->
<!--
  Labelled number input whose tooltip explains why its +/- is disabled. The
  hint shows only while `hint` is set, so the parent decides when a bound is
  reached. UInputNumber is wrapped in a native div because it drops the
  listeners UTooltip's trigger passes to its root (same as UChip).
-->
<script setup lang="ts">
const {
  label,
  hint = undefined,
  icon = undefined,
  min = undefined,
  max = undefined,
  step = undefined,
  disabled = false,
  dimmed = false
} = defineProps<{
  label: string
  hint?: string
  icon?: string
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  // Muted look, e.g. while the value means "off"
  dimmed?: boolean
}>()

const model = defineModel<number>({ required: true })
</script>

<template>
  <div class="space-y-1.5">
    <span class="text-sm">{{ label }}</span>
    <UTooltip
      :text="hint"
      :disabled="!hint"
    >
      <div>
        <UInputNumber
          :model-value="model"
          :min="min"
          :max="max"
          :step="step"
          :icon="icon"
          :disabled="disabled"
          :class="{ 'opacity-50': dimmed }"
          class="w-full"
          @update:model-value="value => (model = Number(value ?? 0))"
        />
      </div>
    </UTooltip>
  </div>
</template>
