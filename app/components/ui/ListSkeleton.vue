<!-- app\components\ui\ListSkeleton.vue -->
<!--
  Placeholder for a list page's own grid/table content while its query is
  loading (issue #35, user request 2026-08-22) — replaces the generic
  spinning-icon block every list page used before, which gave no sense of
  the page's actual shape. Deliberately not the refresh button's own
  `:loading` spinner (QueryRefreshControl.vue, kept as-is per user decision)
  — this is about the content area, not the button.

  Rolled out to /tournaments first as the proof of the pattern; other
  Pinia Colada-backed list pages (associates, leagues, events, locations,
  transactions, wanted-cards, players) can adopt it the same way once this
  shape is confirmed to fit.
-->
<script setup lang="ts">
const { variant, count = 6, columns = 5 } = defineProps<{
  variant: 'grid' | 'table'
  /** How many placeholder cards/rows to render. @default 6 */
  count?: number
  /** Table variant only — how many column bars per row. @default 5 */
  columns?: number
}>()

const items = computed(() => Array.from({ length: count }))
const cols = computed(() => Array.from({ length: columns }))
</script>

<template>
  <div v-if="variant === 'grid'" class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(280px,90vw),1fr))]">
    <div v-for="(_, index) in items" :key="index" class="rounded-lg border border-default overflow-hidden">
      <USkeleton class="w-full h-32 rounded-none" />
      <div class="p-3 space-y-2">
        <USkeleton class="h-4 w-3/4" />
        <USkeleton class="h-3 w-1/2" />
      </div>
    </div>
  </div>

  <div v-else class="rounded-lg border border-default divide-y divide-default overflow-hidden">
    <div v-for="(_row, index) in items" :key="index" class="flex items-center gap-4 px-4 py-3">
      <USkeleton v-for="(_col, colIndex) in cols" :key="colIndex" class="h-4 flex-1" />
    </div>
  </div>
</template>
