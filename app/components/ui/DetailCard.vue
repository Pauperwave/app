<!-- app\components\ui\DetailCard.vue -->
<!--
  Moved out of associates/ (2026-08-20) — always domain-agnostic (title +
  icon-labeled fields, no associate-specific logic), and players/[playerId]
  /index.vue needed the exact same shell.
-->
<script setup lang="ts">
interface DetailField {
  icon: string
  label: string
  value: string
}

const { title, fields, valueClass = '' } = defineProps<{
  title: string
  fields: DetailField[]
  /** Extra classes for each field's value cell (e.g. 'font-mono'). */
  valueClass?: string
}>()
</script>

<template>
  <UCard :ui="{ header: 'font-semibold' }">
    <template #header>
      {{ title }}
    </template>
    <dl class="space-y-2 text-sm">
      <slot name="before" />
      <div v-for="field in fields" :key="field.label" class="flex justify-between items-center gap-4">
        <dt class="flex items-center gap-1.5 text-muted">
          <UIcon :name="field.icon" class="size-4 shrink-0" /> {{ field.label }}
        </dt>
        <dd :class="valueClass">
          {{ field.value }}
        </dd>
      </div>
    </dl>
  </UCard>
</template>
