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

  // Tracks the last id toggled by a plain (non-shift) click — the anchor a
  // subsequent shift-click range selects against, same convention as
  // Explorer/Gmail. Only a plain click moves this anchor (user request,
  // 2026-08-24) — a shift-click range-selects against it but doesn't itself
  // become the new anchor, so repeated shift-clicks (e.g. select 0,
  // shift-click 4, then shift-click 2) keep resolving against the original
  // click rather than sliding onto whatever was last shift-clicked. Reset to
  // null on `clear()`/`setAll` so a stale anchor from a previous, now-cleared
  // selection can't silently reappear.
  const lastToggledId = ref<TId | null>(null) as Ref<TId | null>

  function isSelected(id: TId) {
    return selectedIds.value.has(id)
  }

  // `range`, when passed alongside a shift-click, is the full ordered list of
  // ids currently on screen (a table's filtered rows, a grid's flattened
  // cards) — the range between the last toggled id and `id` is resolved
  // against it, then every id in between is selected (not toggled: shift-click
  // always selects the range, it doesn't flip already-selected rows off).
  // Falls back to a plain toggle when there's no prior anchor or `id` isn't
  // in `range` (e.g. the anchor came from a different, now-filtered-out view).
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
    lastToggledId.value = null
  }

  // Escape always exits a selection (user request, 2026-08-16) — same
  // usingInput/modifier-key guard as TourGuide.vue's arrow-key listener, so
  // this doesn't fire while typing in a form field. Only acts while
  // something is actually selected, so it doesn't fight a modal's own
  // Escape-to-close handling (e.g. the bulk-actions confirm dialog) when
  // there's nothing to clear.
  useEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || selectedIds.value.size === 0) return

    const target = event.target as HTMLElement | null
    const usingInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
    if (usingInput || event.metaKey || event.ctrlKey || event.altKey) return

    clear()
  })

  return { selectedIds, isSelected, toggle, setAll, clear }
}

export type Selection<TId = number> = ReturnType<typeof useSelection<TId>>
