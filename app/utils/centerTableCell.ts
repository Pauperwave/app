// app\utils\centerTableCell.ts
import { h, type VNode } from 'vue'

// Nuxt UI's default theme zeroes a checkbox cell's *end* padding ([&:has([role=checkbox])]:pe-0),
// which was never meant to center it: with a shrink-to-content column (w-px) the checkbox sits
// jammed against one edge. Pair this with `meta: { class: { th: 'w-px p-0', td: 'w-px p-0' } }` on
// the column (drops the inherited padding) and this re-applies it symmetrically via a wrapper div,
// decoupling centering from the theme's padding rules.
export function centerTableCell(content: VNode) {
  return h('div', {
    class: 'flex items-center justify-center py-1 px-2',
    // Both callers wrap a select-column checkbox: rows that navigate on click would otherwise
    // select AND navigate
    onClick: (e: MouseEvent) => e.stopPropagation()
  }, [content])
}
