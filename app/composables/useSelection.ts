// app\composables\useSelection.ts
// Generic row-selection state for every table with a checkbox column + bulk-actions bar. A plain
// Set<id>, not UTable's row-selection state (row index -> boolean): several tables group rows
// (subRows) and/or have multiple views (table + grid) sharing one selection, and an id-keyed Set
// works the same everywhere and survives switching views/pages.
export function useSelection<TId = number>() {
  const selectedIds = ref<Set<TId>>(new Set()) as Ref<Set<TId>>

  // The last id toggled by a plain (non-shift) click: the anchor a shift-click range selects
  // against (like Explorer/Gmail). Only a plain click moves it, so repeated shift-clicks (select 0,
  // shift-click 4, then 2) keep resolving against the original click. Reset on `clear()`/`setAll`
  // so a stale anchor can't reappear
  const lastToggledId = ref<TId | null>(null) as Ref<TId | null>

  function isSelected(id: TId) {
    return selectedIds.value.has(id)
  }

  // `range`, with a shift-click, is the ordered list of ids on screen (a table's filtered rows, a
  // grid's flattened cards): every id between the last toggled id and `id` is selected (not
  // toggled). Falls back to a plain toggle with no anchor or when `id` isn't in `range`
  function toggle(id: TId, options?: { shiftKey?: boolean, range?: TId[] }) {
    if (options?.shiftKey && options.range && lastToggledId.value !== null) {
      const fromIndex = options.range.indexOf(lastToggledId.value)
      const toIndex = options.range.indexOf(id)
      if (fromIndex !== -1 && toIndex !== -1) {
        const [start, end] = fromIndex < toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex]
        setAll(options.range.slice(start, end + 1), true)
        return
      }
    }

    const next = new Set(selectedIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selectedIds.value = next
    lastToggledId.value = id
  }

  // Used for the "select all" header checkbox (over the filtered/visible ids) and a grouped row's
  // checkbox (over that group's subRow ids)
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
    lastToggledId.value = null
  }

  // Escape always exits a selection; only acts while something is selected, so it doesn't fight a
  // modal's own Escape-to-close
  useEscapeToClear(() => selectedIds.value.size > 0, clear)

  return { selectedIds, isSelected, toggle, setAll, clear }
}

export type Selection<TId = number> = ReturnType<typeof useSelection<TId>>
