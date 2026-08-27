// app\composables\useTableRowSelection.ts
// Row-selection + shift-click range-select, extracted out of AcceptancePicker.vue
// once "Pre-registrati" and "Iscritti (Pagato)" needed byte-identical copies of
// it (user request, 2026-08-27) — same checkbox-header-with-indeterminate-state
// pattern as league's own WaitingListTable. Works with any UTable-backed list
// (takes the row items + a getRowId), nothing AcceptancePicker-specific.
import type { Row, Table } from '@tanstack/vue-table'

export function useTableRowSelection<T>(
  items: Ref<T[]> | ComputedRef<T[]>,
  getRowId: (item: T) => string,
  tableRefName: string
) {
  const rowSelection = ref<Record<string, boolean>>({})
  const selectedItems = computed(() =>
    items.value.filter(item => rowSelection.value[getRowId(item)]))

  function clear() {
    rowSelection.value = {}
  }

  function deselect(itemsToDeselect: T[]) {
    for (const item of itemsToDeselect)
      Reflect.deleteProperty(rowSelection.value, getRowId(item))
  }

  // Only needed for the checkbox path — its `update:modelValue` reports the
  // new boolean, not the click event, so the shiftKey has to be captured
  // separately from the checkbox's own `click` (fires first). The row-click
  // path (handleRowSelect below) gets the real Event and reads `.shiftKey`
  // off it directly.
  let checkboxShiftKey = false
  let lastIndex: number | null = null

  function handleCheckboxClick(event: MouseEvent) {
    event.stopPropagation()
    checkboxShiftKey = event.shiftKey
  }

  // A shift-click range builds the next selection object directly off our own
  // `rowSelection` ref and assigns it once — NOT a loop of `row.toggleSelected()`
  // calls. UTable's row-selection is bound via v-model, and TanStack's internal
  // table only re-syncs its state.rowSelection from that ref on the next
  // reactive flush, not synchronously mid-function — N synchronous
  // toggleSelected() calls in a loop each compute their patch against the same
  // pre-loop snapshot, so only the last call's write survives. Building the
  // whole object from `rowSelection.value` — always current, since it's our
  // own ref — sidesteps that entirely.
  function toggleRowSelection<TRow>(
    table: Table<TRow>, row: Row<TRow>, value: boolean, shiftKey: boolean
  ) {
    if (shiftKey && lastIndex !== null) {
      const rows = table.getRowModel().rows
      const [start, end] = lastIndex < row.index ? [lastIndex, row.index] : [row.index, lastIndex]
      const next = { ...rowSelection.value }
      for (let i = start; i <= end; i++) {
        const targetRow = rows[i]
        if (!targetRow || !targetRow.getCanSelect()) continue
        if (value) next[targetRow.id] = true
        else Reflect.deleteProperty(next, targetRow.id)
      }
      rowSelection.value = next
      // Anchor stays put on a shift-click (classic Explorer/Sheets behavior)
      // — only a plain click below moves it.
    } else {
      row.toggleSelected(value)
      lastIndex = row.index
    }
  }

  function toggleFromCheckbox<TRow>(table: Table<TRow>, row: Row<TRow>, value: boolean) {
    toggleRowSelection(table, row, value, checkboxShiftKey)
    checkboxShiftKey = false
  }

  // Clicking anywhere on a row toggles its own checkbox — UTable's own
  // `onSelect` prop already skips clicks inside a <button>/<a> (see Nuxt UI's
  // Table.vue), so this doesn't fight the checkbox's own click handling or a
  // row's other action buttons.
  const tableRef = useTemplateRef<{ tableApi: Table<T> }>(tableRefName)

  function handleRowSelect(event: Event, row: Row<T>) {
    const table = tableRef.value?.tableApi
    if (table) toggleRowSelection(table, row, !row.getIsSelected(), (event as MouseEvent).shiftKey)
  }

  return {
    rowSelection, selectedItems, clear, deselect,
    handleCheckboxClick, toggleFromCheckbox, handleRowSelect
  }
}
