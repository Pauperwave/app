<!-- app\components\ui\ListSkeleton.vue -->
<!-- Placeholder for a list page's table content while its query loads, replacing the generic
     spinning-icon block that gave no sense of the page's shape. Deliberately not the refresh
     button's own `:loading` spinner (QueryRefreshControl.vue): this is about the content area,
     not the button.  Grid-shaped list pages don't use this component: hand-duplicating
     TournamentsListCard.vue's markup here drifted out of sync (a missed overlay chip, wrong
     badge shape, wrong reserved height), so the reliable pattern is a `loading` prop on the
     real card component, branching per element between real content and USkeleton (see
     Card.vue/Cover.vue/GridView.vue). A future table-shaped list page can reuse this as-is; a
     grid-shaped one should follow tournaments' `loading`-prop pattern. -->
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
