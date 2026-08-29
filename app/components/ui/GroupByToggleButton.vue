<!-- app\components\ui\GroupByToggleButton.vue -->
<!--
  Icon-only "group by X" toggle (transactions/index.vue's own pattern,
  reused instead of wanted-cards/index.vue hand-rolling a second,
  differently-styled copy — user request, 2026-08-29: "Devi copiare il
  'Raggruppa per giocatore' della pagina transactions, non puoi riutilizzare
  lo stesso componente?"). Just the button + tooltip; the actual grouping
  state/toggle logic stays with each caller (transactions groups by payer,
  wanted-cards by player — different Pinia Colada data, not shareable).
-->
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
