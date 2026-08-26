// app\composables\useEscapeToClear.ts
// Extracted out of useSelection.ts's own Escape handling (2026-08-27) once
// AcceptancePicker.vue needed the identical guard for its two plain
// Record<string, boolean> row-selection refs — UTable's own
// v-model:row-selection shape, not a Set, so it can't just use
// useSelection() itself here. `hasSelection`/`clear` are passed in rather
// than assumed to be a Set, so either selection model can share this.
export function useEscapeToClear(hasSelection: () => boolean, clear: () => void) {
  useEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !hasSelection()) return

    const target = event.target as HTMLElement | null
    const usingInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
    if (usingInput || event.metaKey || event.ctrlKey || event.altKey) return

    clear()
  })
}
