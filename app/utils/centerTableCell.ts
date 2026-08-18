// app\utils\centerTableCell.ts
import { h, type VNode } from 'vue'

// Nuxt UI's own default theme zeroes a checkbox cell's *end* padding
// ([&:has([role=checkbox])]:pe-0) to kill the redundant trailing gutter next
// to an adjacent column — it was never meant to center the checkbox within
// its own cell, so combined with a shrink-to-content column width (w-px) the
// checkbox reads as jammed against one edge (confirmed 2026-08-13 against
// Nuxt UI's own reference theme). Pair this with `meta: { class: { th: 'w-px
// p-0', td: 'w-px p-0' } }` on the column (opts out of that inherited
// padding entirely) — this re-applies it symmetrically via a wrapper div
// instead, decoupling centering from the table theme's padding rules.
// Extracted from useWantedCardsTableColumns.ts/useAssociatesTableColumns.ts
// once both needed the identical fix for their selectColumn.
export function centerTableCell(content: VNode) {
  return h('div', {
    class: 'flex items-center justify-center py-1 px-2',
    // Both current callers wrap a select-column checkbox — rows that also
    // navigate on click (UTable's @select, e.g. associates/index.vue) would
    // otherwise select AND navigate away from the same click.
    onClick: (e: MouseEvent) => e.stopPropagation()
  }, [content])
}
