<!-- app\components\finance\SummaryCard.vue -->
<!--
  Extracted out of Category/Event/Format/Method/Month/Tournament/TypeSummary
  Table.vue (2026-08-29, fallow:dupes) — every one of them wrapped its
  UTable in the exact same UCard + ListSkeleton pair, differing only in the
  header title and the columns-count passed to the skeleton. The UTable
  itself stays a slot, not folded in here: sorting/columns/:ui differ enough
  per table (e.g. TournamentSummaryTable has no `:ui="{ base: 'overflow-clip' }"`)
  that forcing it into this wrapper's own props would trade real flexibility
  for a few more shared lines.
-->
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
