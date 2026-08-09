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

const columnPinning = ref({
  left: columnPinningLeft,
  right: columnPinningRight
})

// Column half of the hover crosshair (row half is pure CSS below). UTable's
// `meta.class.td` looks reactive — it accepts a function — but isn't: `meta` is
// forwarded to useVueTable as `meta.value`, a snapshot taken once at mount, and
// the callback runs inside UTable's own render scope, which Vue does not
// re-invalidate when a ref mutated from a cell's `onMouseenter` changes
// (confirmed against @nuxt/ui 4.10.0's Table.vue source). No amount of state
// plumbing through `meta` fixes this without forcing the whole table to
// re-render on every mouse move.
//
// DOM event delegation sidesteps it entirely: one listener on the wrapper
// (not one per cell), reading `cellIndex` — which already matches visual
// column position even with pinning, since TanStack physically reorders pinned
// columns to the DOM edges rather than only repositioning them with CSS. The
// matched column is painted via a <style> tag (VueUse's useStyleTag — SSR-safe
// no-op on the server, cleans itself up on unmount), scoped to this instance by
// a generated id: CSS has no way to parametrize `:nth-child` with a custom
// property, so a static scoped rule can't do this on its own.
const matrixId = `sm${useId().replace(/[^a-zA-Z0-9]/g, '')}`
const hoveredColIndex = ref<number | null>(null)

const crosshairCss = computed(() => {
  const index = hoveredColIndex.value
  if (index === null) return ''

  // UTable sets data-pinned="false" on every unpinned cell rather than omitting
  // the attribute, so :not([data-pinned]) matches nothing — the value has to be
  // excluded explicitly. Pinned columns already force an opaque bg-default
  // (below) to occlude the columns scrolling underneath them, and this rule
  // would otherwise fight that on specificity depending on injection order.
  return `
    #${matrixId} td:nth-child(${index + 1}):not([data-pinned="left"]):not([data-pinned="right"]),
    #${matrixId} th:nth-child(${index + 1}):not([data-pinned="left"]):not([data-pinned="right"]) {
      background-color: var(--ui-bg-elevated);
    }
  `
})

useStyleTag(crosshairCss)

function onMouseover(event: MouseEvent) {
  const cell = (event.target as HTMLElement).closest('td, th')
  hoveredColIndex.value = cell instanceof HTMLTableCellElement ? cell.cellIndex : null
}

function onMouseleave() {
  hoveredColIndex.value = null
}
</script>

<template>
  <div
    :id="matrixId"
    class="standings-matrix"
    @mouseover="onMouseover"
    @mouseleave="onMouseleave"
  >
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

/* Row half of the hover crosshair. Targeting the cells rather than the row is
   deliberate: the opaque pinned backgrounds above would hide a background set on
   <tr>. This selector outranks them on specificity, which is what keeps the
   highlight continuous across frozen and scrolling columns. No transition: with
   ~1300 cells in the matrix, animating background-color on every hover/scroll
   was measurably janky, and :hover is a native state change the browser already
   optimizes for free when left alone. */
.standings-matrix :deep(tbody tr:hover > td) {
  background-color: var(--ui-bg-elevated);
}
</style>
