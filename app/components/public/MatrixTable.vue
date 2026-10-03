<!-- app\components\public\MatrixTable.vue -->
<script setup lang="ts" generic="T">
import type { TableColumn } from '@nuxt/ui'

interface Props {
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  // Passed straight through to UTable's `meta` — e.g. the cittadino page uses it
  // to draw a border under the finalist cutoff row. Shape is caller-defined.
  meta?: Record<string, unknown>
  // Position + player identity stay pinned left and the total pinned right, so a reader scrolling a
  // wide matrix never loses "who is this row and what is their score": the reason this component
  // exists. Column ids match the shape every standings table uses (see
  // useCittadinoTableColumns.ts); override if a format's columns differ
  columnPinningLeft?: string[]
  columnPinningRight?: string[]
  // Column id -> CSS color to tint the column's hover crosshair toward (e.g. each Cittadino event
  // column in its format's color). Columns with no entry, or callers that don't pass this, keep the
  // plain bg-elevated highlight
  columnAccentColors?: Record<string, string>
}

const {
  data,
  columns,
  loading = false,
  meta = {},
  columnPinningLeft = ['position', 'playerName'],
  columnPinningRight = ['total'],
  columnAccentColors = {}
} = defineProps<Props>()

const columnPinning = ref({
  left: columnPinningLeft,
  right: columnPinningRight
})

// Column half of the hover crosshair (the row half is pure CSS below). UTable's `meta.class.td`
// looks reactive (it accepts a function) but isn't: `meta` is forwarded to useVueTable as
// `meta.value`, a snapshot taken once at mount, and the callback runs in UTable's render scope,
// which Vue doesn't re-invalidate when a ref mutated from a cell's `onMouseenter` changes (checked
// against @nuxt/ui 4.10.0's Table.vue). No state plumbing through `meta` fixes this without
// re-rendering the whole table on every mouse move.
//
// DOM event delegation sidesteps it: one listener on the wrapper (not per cell), reading
// `cellIndex`, which matches the visual column position even with pinning (TanStack physically
// reorders pinned columns to the DOM edges). The matched column is painted via a <style> tag
// (VueUse's useStyleTag: SSR-safe no-op on the server, cleans up on unmount), scoped to this
// instance by a generated id, since CSS can't parametrize `:nth-child` with a custom property, so a
// static scoped rule can't do this alone
const matrixId = `sm${useId().replace(/[^a-zA-Z0-9]/g, '')}`
const hoveredColIndex = ref<number | null>(null)

const crosshairCss = computed(() => {
  const index = hoveredColIndex.value
  if (index === null) return ''

  // Same DOM-order assumption nth-child itself relies on: props.columns[index]
  // is the column definition currently under the pointer, so its `id` is what
  // columnAccentColors is keyed by (e.g. an event's uuid).
  const accent = columns[index]?.id ? columnAccentColors[columns[index].id as string] : undefined

  // Blended into bg-elevated rather than used at full saturation: a raw format
  // colour across a whole column would be too loud next to 45 rows of digits,
  // and blending keeps the digits' contrast close to the neutral highlight's.
  const background = accent
    ? `color-mix(in oklab, ${accent} 25%, var(--ui-bg-elevated))`
    : 'var(--ui-bg-elevated)'

  // UTable sets data-pinned="false" on every unpinned cell rather than omitting it, so
  // :not([data-pinned]) matches nothing: the value must be excluded explicitly. Pinned columns
  // already force an opaque bg-default (below) to occlude the columns scrolling under them, and
  // this rule would otherwise fight it on specificity depending on injection order.
  //
  // tbody only: the header row keeps its own identity (name + date chip, already colored by format)
  return `
    #${matrixId} tbody td:nth-child(${index + 1}):not([data-pinned="left"]):not([data-pinned="right"]) {
      background-color: ${background};
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
        // max-h caps root's default overflow-auto so the table (not the page) scrolls, keeping the
        // sticky header/pinned columns anchored to one scroller. rounded-lg alone won't clip
        // sticky/pinned cells once scrolled (overflow clipping doesn't reliably apply to
        // position:sticky descendants), hence the clip-path, which clips at paint time regardless
        // of positioning
        root: 'max-h-[calc(100svh-10rem)] rounded-lg [clip-path:inset(0_round_var(--radius-lg))]',
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
