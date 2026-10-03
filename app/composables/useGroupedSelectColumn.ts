// app\composables\useGroupedSelectColumn.ts
import { UCheckbox } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/vue-table'
import type { Selection } from '~/composables/useSelection'

// Flattens the table's final row model (post filter/sort/group) into its leaf ids in on-screen
// order, recursing into subRows so a grouped table's sort-by-subRows-count still yields the right
// order. Not tableApi.getFilteredRowModel(): that stage runs *before* sorting in TanStack's
// pipeline, so it ignores the active sort (a shift-click range after sorting by name selected the
// wrong rows)
function orderedLeafIds<T extends { id: number }>(rows: Row<T>[]): number[] {
  return rows.flatMap(row => row.subRows.length ? orderedLeafIds(row.subRows) : [row.original.id])
}

// Shared by useTransactionsTableColumns.ts/useWantedCardsTableColumns.ts: bound to the shared
// selectedIds Set (useSelection.ts), not UTable's row-selection state, because grouping needs a
// group's checkbox to reflect/drive all its subRows, like the "select all" header checkbox
export function useGroupedSelectColumn<T extends { id: number }>(
  selection: Selection<number>
): TableColumn<T> {
  const { t } = useI18n()

  // Captured from the checkbox's native `click` (fires before the `update:modelValue` it triggers)
  // to tell a shift-click from a plain one: UCheckbox's v-model only reports the new value, not the
  // event. Module-level to this call, shared across every checkbox's render
  let lastClickShiftKey = false

  // Tri-state checkbox for a set of ids (header "select all" or a group row):
  // true/indeterminate/false by how many `ids` are selected
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
      // Range = the visible leaf rows in on-screen order (the set the header "select all" uses),
      // not the unfiltered or pre-sort dataset
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
