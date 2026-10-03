<!-- app\components\ui\GroupByToggleButton.vue -->
<!-- Icon-only "group by X" toggle (transactions/index.vue's pattern, reused instead of
     wanted-cards/index.vue hand-rolling a differently styled copy). Just the button + tooltip:
     the grouping state/toggle logic stays with each caller (transactions groups by payer,
     wanted-cards by player: different Pinia Colada data, not shareable). -->
<script setup lang="ts">
const { label, grouped } = defineProps<{
  label: string
  grouped: boolean
}>()

const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <UTooltip :text="label">
    <UButton
      :icon="ICONS.players"
      color="neutral"
      :variant="grouped ? 'solid' : 'outline'"
      :aria-label="label"
      @click="emit('toggle')"
    />
  </UTooltip>
</template>
