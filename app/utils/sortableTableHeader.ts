// app\utils\sortableTableHeader.ts
import { h } from 'vue'
import { UButton } from '#components'
import type { Column } from '@tanstack/vue-table'

// Tri-state (none -> asc -> desc -> none), not a plain asc/desc toggle: lets a
// column go back to the table's initial order instead of being stuck cycling.
// Extracted once this reached a 4th copy (associates, leagues, tournaments,
// wanted-cards table columns) that had already started drifting — associates'
// copy had the tri-state behavior, the other three didn't.
export function sortableHeader<TData>(label: string, column: Column<TData, unknown>) {
  const isSorted = column.getIsSorted()
  return h(UButton, {
    label,
    color: 'neutral',
    variant: 'ghost',
    class: '-mx-2.5',
    icon: isSorted === 'asc'
      ? 'i-lucide-arrow-up-narrow-wide'
      : isSorted === 'desc'
        ? 'i-lucide-arrow-down-wide-narrow'
        : 'i-lucide-arrow-up-down',
    onClick: () => {
      if (isSorted === 'asc') column.toggleSorting(true)
      else if (isSorted === 'desc') column.clearSorting()
      else column.toggleSorting(false)
    }
  })
}
