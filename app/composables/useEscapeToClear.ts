// app\composables\useEscapeToClear.ts
// Escape-to-clear guard extracted from useSelection.ts, needed by AcceptancePicker.vue for its two
// plain Record<string, boolean> row-selection refs (UTable's v-model:row-selection shape, not a
// Set). `hasSelection`/`clear` are passed in rather than assuming a Set, so either selection model
// can share it
export function useEscapeToClear(hasSelection: () => boolean, clear: () => void) {
  useEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !hasSelection()) return

    const target = event.target as HTMLElement | null
    const usingInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
    if (usingInput || event.metaKey || event.ctrlKey || event.altKey) return

    clear()
  })
}
