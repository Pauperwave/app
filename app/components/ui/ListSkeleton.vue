<!-- app\components\ui\ListSkeleton.vue -->
<!--
  Placeholder for a list page's own table content while its query is loading
  (issue #35, user request 2026-08-22) — replaces the generic spinning-icon
  block every list page used before, which gave no sense of the page's
  actual shape. Deliberately not the refresh button's own `:loading` spinner
  (QueryRefreshControl.vue, kept as-is per user decision) — this is about
  the content area, not the button.

  Grid-shaped list pages don't use this component (2026-08-22, superseding
  an earlier grid variant here): after several rounds of hand-duplicating
  TournamentsListCard.vue's exact markup here and having it drift out of
  sync (a missed overlay chip, a wrong badge shape, a wrong reserved
  height — see the commit history), the more reliable pattern turned out to
  be a `loading` prop on the real card component itself, branching per-
  element between real content and USkeleton — see Card.vue/Cover.vue/
  GridView.vue. One shell, so nothing can structurally drift again. A future
  table-shaped list page can still reuse this component as-is; a future
  grid-shaped one should follow tournaments' `loading`-prop pattern instead
  of extending this file.
-->
<script setup lang="ts">
const { count = 6, columns = 5 } = defineProps<{
  /** How many placeholder rows to render. @default 6 */
  count?: number
  /** How many column bars per row. @default 5 */
  columns?: number
}>()

const items = computed(() => Array.from({ length: count }))
const cols = computed(() => Array.from({ length: columns }))
</script>

<template>
  <div class="rounded-lg border border-default divide-y divide-default overflow-hidden">
    <div
      v-for="(_row, index) in items"
      :key="index"
      class="flex items-center gap-4 px-4 py-3"
    >
      <USkeleton
        v-for="(_col, colIndex) in cols"
        :key="colIndex"
        class="h-4 flex-1"
      />
    </div>
  </div>
</template>
