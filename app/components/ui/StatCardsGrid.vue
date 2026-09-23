<!-- app\components\ui\StatCardsGrid.vue -->
<!-- 2x4 grid of label/value UCards — shared by the commander/deck detail
     pages, which independently duplicated this exact markup with different
     stat lists (fallow:dupes, 2026-09-23). -->
<script setup lang="ts">
interface Stat {
  label: string
  value: number | string
}

const { stats } = defineProps<{ stats: Stat[] }>()
</script>

<template>
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
    <UCard
      v-for="stat in stats"
      :key="stat.label"
    >
      <p class="text-xs text-muted uppercase mb-1">
        {{ stat.label }}
      </p>
      <p class="text-2xl font-semibold">
        {{ stat.value }}
      </p>
    </UCard>
  </div>
</template>
