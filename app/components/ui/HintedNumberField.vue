<!-- app\components\ui\HintedNumberField.vue -->
<!--
  Labelled number input with two tooltips: `info` (an "i" icon next to the
  label, always available) explains what the setting does, and `hint` (on the
  input) explains why its +/- is disabled — it shows only while it's set, so
  the parent decides when a bound is reached. UInputNumber is wrapped in a
  native div because it drops the listeners UTooltip's trigger passes to its
  root (same as UChip).
-->
<script setup lang="ts">
const {
  label,
  info = undefined,
  hint = undefined,
  icon = undefined,
  min = undefined,
  max = undefined,
  step = undefined,
  size = undefined,
  disabled = false,
  dimmed = false
} = defineProps<{
  label: string
  // What the setting does, shown on the info icon
  info?: string
  hint?: string
  icon?: string
  min?: number
  max?: number
  step?: number
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  disabled?: boolean
  // Muted look, e.g. while the value means "off"
  dimmed?: boolean
}>()

const model = defineModel<number>({ required: true })
</script>

<template>
  <div class="space-y-1">
    <div class="flex items-center gap-1.5">
      <span class="text-xs">{{ label }}</span>
      <UTooltip
        v-if="info"
        :text="info"
        :ui="{
          content: 'h-auto max-w-72 py-1.5',
          text: '!whitespace-normal !overflow-visible !text-clip'
        }"
      >
        <span
          class="inline-flex cursor-help text-muted"
          tabindex="0"
          role="img"
          :aria-label="info"
        >
          <UIcon :name="ICONS.info" class="size-4" />
        </span>
      </UTooltip>
    </div>
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
          :size="size"
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
