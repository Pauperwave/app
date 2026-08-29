// app\composables\useSelectedTableRows.ts
// Extracted out of associates/index.vue and associates/requests.vue
// (2026-08-29, fallow:dupes) — both resolved the current selection against
// the table's own *filtered* row model (not the raw data array), so a
// selection hidden by an active column filter isn't actionable, byte-
// identical apart from the variable name.
import type { Table } from '@tanstack/vue-table'
import type { Selection } from '~/composables/useSelection'

export function useSelectedTableRows<T extends { id: number }>(
  table: Ref<{ tableApi: Table<T> } | null>,
  selection: Selection<number>
) {
  return computed<T[]>(() =>
    (table.value?.tableApi?.getFilteredRowModel().rows.map(row => row.original) ?? [])
      .filter(item => selection.isSelected(item.id)))
}
