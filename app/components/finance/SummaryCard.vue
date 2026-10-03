<!-- app\components\finance\SummaryCard.vue -->
<!-- Extracted from Category/Event/Format/Method/Month/Tournament/TypeSummaryTable.vue: each
     wrapped its UTable in the same UCard + ListSkeleton pair, differing only in the header
     title and the skeleton's columns-count. The UTable itself stays a slot, not folded in:
     sorting/columns/:ui differ per table (TournamentSummaryTable has no `:ui="{ base:
     'overflow-clip' }"`), and forcing them into this wrapper's props would trade real
     flexibility for a few shared lines. -->
<script setup lang="ts">
const { title, pending = false, columnsCount } = defineProps<{
  title: string
  pending?: boolean
  columnsCount: number
}>()
</script>

<template>
  <UCard :ui="{ header: 'font-semibold' }">
    <template #header>
      {{ title }}
    </template>
    <ListSkeleton v-if="pending" :columns="columnsCount" />
    <slot v-else />
  </UCard>
</template>
