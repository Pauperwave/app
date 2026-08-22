// app\composables\useGroupedSelectColumn.ts
import { UCheckbox } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/vue-table'
import type { Selection } from '~/composables/useSelection'

// Flattens the table's own final row model (post filter/sort/group) into
// just its leaf ids, in on-screen order — recurses into subRows so a
// grouped table's own sort-by-subRows-count still yields the right order.
// Not tableApi.getFilteredRowModel(): that stage runs *before* sorting in
// TanStack's pipeline, so it silently ignores the active sort — a bug found
// 2026-08-22 (shift-click range after sorting by name selected the wrong
// tournaments, since the range was built from insertion order instead of
// the order the checkboxes were actually visible in).
function orderedLeafIds<T extends { id: number }>(rows: Row<T>[]): number[] {
  return rows.flatMap(row => row.subRows.length ? orderedLeafIds(row.subRows) : [row.original.id])
}

// Shared by useTransactionsTableColumns.ts/useWantedCardsTableColumns.ts
// (fallow:dupes flagged this as an identical 54-line clone) — bound to the
// shared selectedIds Set (useSelection.ts), not UTable's own row-selection
// state, because grouping (rows with subRows) needs a group's checkbox to
// reflect/drive all its subRows at once, the same way as the plain
// "select all" header checkbox.
export function useGroupedSelectColumn<T extends { id: number }>(
  selection: Selection<number>
): TableColumn<T> {
  const { t } = useI18n()

  // Captured from the checkbox's own native `click` (fires synchronously
  // before the `update:modelValue` it triggers) so a shift-click can be told
  // apart from a plain one — UCheckbox's v-model only reports the new value,
  // not the triggering event. Module-level to this call (not per-cell),
  // shared across every checkbox's render.
  let lastClickShiftKey = false

  // Tri-state checkbox for a set of ids (the header's "select all", or a
  // group row's own checkbox) — true/indeterminate/false depending on how
  // many of `ids` are currently selected.
  function groupCheckbox(ids: number[], ariaLabel: string) {
    const allSelected = ids.length > 0 && ids.every(id => selection.isSelected(id))
    const someSelected = ids.some(id => selection.isSelected(id))
    return centerTableCell(h(UCheckbox, {
      'modelValue': allSelected ? true : (someSelected ? 'indeterminate' : false),
      'onUpdate:modelValue': (value: unknown) => selection.setAll(ids, !!value),
      'aria-label': ariaLabel
    }))
  }

  return {
    id: 'select',
    enableSorting: false,
    enableHiding: false,
    meta: { class: { th: 'w-px p-0', td: 'w-px p-0' } },
    header: ({ table: tableApi }) => {
      const ids = orderedLeafIds(tableApi.getRowModel().rows)
      return groupCheckbox(ids, t('common.selectAll'))
    },
    cell: ({ row, table: tableApi }) => {
      if (row.getIsGrouped()) {
        return groupCheckbox(row.subRows.map(subRow => subRow.original.id), t('common.selectRow'))
      }
      // Range = the currently visible leaf rows in on-screen order, same set
      // the header checkbox's "select all" already operates on — a
      // shift-click range resolves against what's on screen, not the full
      // unfiltered dataset or its pre-sort insertion order.
      const range = orderedLeafIds(tableApi.getRowModel().rows)
      return centerTableCell(h(UCheckbox, {
        'modelValue': selection.isSelected(row.original.id),
        'onUpdate:modelValue': () =>
          selection.toggle(row.original.id, { shiftKey: lastClickShiftKey, range }),
        'onClick': (e: MouseEvent) => { lastClickShiftKey = e.shiftKey },
        'aria-label': t('common.selectRow')
      }))
    }
  }
}
