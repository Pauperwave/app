// app\composables\useSelection.ts
// Generic row-selection state, shared across every table that grows a checkbox
// column + bulk-actions toolbar bar (wanted-cards first, associates/requests
// next — see docs/architecture). A plain Set<id>, not UTable's built-in
// row-selection state (row index -> boolean): several tables here support
// grouping (rows with subRows) and/or multiple views (table + grid) sharing one
// selection — an id-keyed Set is the one model that works the same way
// everywhere and survives switching views/pages.
export function useSelection<TId = number>() {
  const selectedIds = ref<Set<TId>>(new Set()) as Ref<Set<TId>>

  function isSelected(id: TId) {
    return selectedIds.value.has(id)
  }

  function toggle(id: TId) {
    const next = new Set(selectedIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selectedIds.value = next
  }

  // Used both for the "select all" header checkbox (against the currently
  // filtered/visible ids) and for a grouped row's checkbox (against just that
  // group's subRow ids).
  function setAll(ids: TId[], selected: boolean) {
    const next = new Set(selectedIds.value)
    for (const id of ids) {
      if (selected) next.add(id)
      else next.delete(id)
    }
    selectedIds.value = next
  }

  function clear() {
    selectedIds.value = new Set()
  }

  return { selectedIds, isSelected, toggle, setAll, clear }
}

export type Selection<TId = number> = ReturnType<typeof useSelection<TId>>
