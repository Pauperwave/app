// app\composables\useChordHintKey.ts

/**
 * True from the moment `key` is pressed until the next keystroke (whatever it
 * is — the chord's second key, or an unrelated key that just gives up on it).
 * Same "press-and-hold-visible" hint mechanism as default.vue's own "g" nav
 * hint (docs/architecture/shortcuts.md), extracted here since `f` (fullscreen
 * chords) needs the identical listener in more than one component.
 */
export function useChordHintKey(key: string) {
  const active = ref(false)

  useEventListener('keydown', (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null
    const usingInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
    if (usingInput || event.metaKey || event.ctrlKey || event.altKey) {
      return
    }

    active.value = event.key.toLowerCase() === key
  })

  return active
}
