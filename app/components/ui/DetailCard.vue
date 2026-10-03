<!-- app\components\ui\DetailCard.vue -->
<!-- A domain-agnostic detail shell (title + icon-labeled fields, no associate-specific logic),
     moved out of associates/ because players/[playerId]/index.vue needs the same one. -->
<script setup lang="ts">
interface DetailField {
  icon: string
  label: string
  value: string
}

const {
  title, fields, valueClass = '', icon = undefined
} = defineProps<{
  title: string
  /** Optional icon before the title (the player profile's cards have one). */
  icon?: string
  fields: DetailField[]
  /** Extra classes for each field's value cell (e.g. 'font-mono'). */
  valueClass?: string
}>()
</script>

<template>
  <UCard :ui="{ header: 'font-semibold' }">
    <template #header>
      <span class="flex items-center gap-2">
        <UIcon
          v-if="icon"
          :name="icon"
          class="size-5 shrink-0 text-primary"
        />
        {{ title }}
      </span>
    </template>
    <dl class="space-y-2 text-sm">
      <slot name="before" />
      <div
        v-for="field in fields"
        :key="field.label"
        class="flex justify-between items-center gap-4"
      >
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
