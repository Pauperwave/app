<!-- app\components\standings\MatrixTable.vue -->
<script setup lang="ts" generic="T">
import type { TableColumn } from '@nuxt/ui'

interface Props {
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  // Passed straight through to UTable's `meta` — e.g. the cittadino page uses it
  // to draw a border under the finalist cutoff row. Shape is caller-defined.
  meta?: Record<string, unknown>
  // Position + player identity stay pinned left, the total stays pinned right, so
  // a reader scrolling deep into a wide matrix never loses "who is this row and
  // what is their score" — the whole reason this component exists. Column ids
  // match the shape every standings table built so far uses (see
  // useCittadinoTableColumns.ts); override if a format's columns differ.
  columnPinningLeft?: string[]
  columnPinningRight?: string[]
}

const {
  data,
  columns,
  loading = false,
  meta = {},
  columnPinningLeft = ['position', 'playerName'],
  columnPinningRight = ['total']
} = defineProps<Props>()

const emit = defineEmits<{
  mouseleave: []
}>()

const columnPinning = ref({
  left: columnPinningLeft,
  right: columnPinningRight
})
</script>

<template>
  <div class="standings-matrix" @mouseleave="emit('mouseleave')">
    <UTable
      v-model:column-pinning="columnPinning"
      sticky
      :loading="loading"
      :data="data"
      :columns="columns"
      :meta="meta"
      class="w-full"
      :ui="{
        // The sticky header only works if the table itself is the element
        // that scrolls. UTable's root is overflow-auto but height-less, so
        // without a cap it never scrolls, the dashboard panel scrolls
        // instead, and thead scrolls away with the page. Capping the height
        // also keeps both axes on the same scroller, which is what the
        // pinned columns need. The subtraction is the panel chrome above and
        // below: margins, navbar, toolbar and body padding.
        root: 'max-h-[calc(100svh-10rem)]',
        td: 'py-1.5 text-sm',
        th: 'py-2 align-bottom'
      }"
    />
  </div>
</template>

<style scoped>
/* The theme pins cells with `bg-default/75` and, unlike the sticky header, without
   a backdrop-blur — so the columns scrolling underneath show through at 25%. Make
   them opaque instead; blur would smear the digits in a numeric matrix. */
.standings-matrix :deep(th[data-pinned]),
.standings-matrix :deep(td[data-pinned]) {
  background-color: var(--ui-bg);
}

/* The `sticky` prop already fixes the header row, but with the same translucent
   `bg-default/75` — rows scrolling under it stayed faintly visible. */
.standings-matrix :deep(thead) {
  background-color: var(--ui-bg);
}

/* Frozen corner: the header cells that are both sticky-top and pinned sit at the
   intersection of the two axes, so they have to outrank each of them on their own. */
.standings-matrix :deep(thead th[data-pinned]) {
  z-index: 2;
}

/* Row half of the hover crosshair (the column half, when a caller needs one, is
   its own responsibility — see the cittadino page). Targeting the cells rather
   than the row is deliberate: the opaque pinned backgrounds above would hide a
   background set on <tr>. This selector outranks them on specificity, which is
   what keeps the highlight continuous across frozen and scrolling columns. */
.standings-matrix :deep(tbody tr:hover > td) {
  background-color: var(--ui-bg-elevated);
}
</style>
