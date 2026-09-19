<!-- app\components\ui\PresetButtons.vue -->
<!--
  Generic named-preset quick-select: a group of preset buttons, an optional
  "reset" button and a "custom" button. Extracted from the pairing and prize
  preset buttons, which were the same markup with different options.
  "Custom" is an inert indicator (lit when the values match no preset) unless
  `customClickable` is set, in which case it restores the organizer's own
  saved values and is disabled while none exist.
-->
<script setup lang="ts" generic="Key extends string">
const {
  options,
  selected,
  customLabel,
  resetLabel = '',
  resetDisabled = false,
  customClickable = false,
  customDisabled = false,
  customHint = ''
} = defineProps<{
  options: ReadonlyArray<{ key: Key, label: string, icon: string }>
  selected: Key | 'custom'
  customLabel: string
  // The reset button only shows when a label is given
  resetLabel?: string
  // Nothing to reset (already at the starting values)
  resetDisabled?: boolean
  customClickable?: boolean
  customDisabled?: boolean
  // Tooltip shown while the custom button is disabled
  customHint?: string
}>()

const emit = defineEmits<{
  select: [preset: Key]
  reset: []
  custom: []
}>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <UFieldGroup>
      <UButton
        v-for="option in options"
        :key="option.key"
        :icon="option.icon"
        :color="selected === option.key ? 'primary' : 'neutral'"
        :variant="selected === option.key ? 'soft' : 'outline'"
        @click="emit('select', option.key)"
      >
        {{ option.label }}
      </UButton>
    </UFieldGroup>

    <UButton
      v-if="resetLabel"
      :disabled="resetDisabled"
      :icon="ICONS.rotateBack"
      color="warning"
      variant="soft"
      @click="emit('reset')"
    >
      {{ resetLabel }}
    </UButton>

    <UTooltip
      :text="customHint"
      :disabled="!customDisabled || !customHint"
    >
      <!-- span keeps the tooltip working while a disabled button ignores pointer events -->
      <span>
        <UButton
          :icon="ICONS.filters"
          :color="selected === 'custom' ? 'primary' : 'neutral'"
          :variant="selected === 'custom' ? 'soft' : 'outline'"
          :disabled="customDisabled"
          :class="{ 'pointer-events-none select-none': !customClickable }"
          @click="customClickable && emit('custom')"
        >
          {{ customLabel }}
        </UButton>
      </span>
    </UTooltip>
  </div>
</template>
