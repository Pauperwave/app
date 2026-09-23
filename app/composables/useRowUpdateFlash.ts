// app\composables\useRowUpdateFlash.ts
// Briefly flags rows whose data just changed, for a plain "just updated"
// flash — same shape/timing as useChangeFlash.ts, but keyed by an arbitrary
// string signature instead of a single number, since there's no single
// up/down value to compare (e.g. a standings row changing rank/points/
// tiebreaks all at once as a new result comes in). No gain/loss distinction
// either: every change gets the same neutral "this just updated" tint. The
// first signature an item is seen with never flashes, only later changes do.
export function useRowUpdateFlash(
  items: MaybeRefOrGetter<Array<{ key: string, signature: string }>>,
  duration = 900
) {
  const flashedKeys = ref<Set<string>>(new Set())
  let previousSignatures = new Map<string, string>()
  let timer: ReturnType<typeof setTimeout> | undefined

  watch(() => toValue(items).map(item => item.signature), () => {
    const current = toValue(items)
    const changed = new Set<string>()

    for (const { key, signature } of current) {
      const before = previousSignatures.get(key)
      if (before !== undefined && before !== signature) changed.add(key)
    }
    previousSignatures = new Map(current.map(({ key, signature }) => [key, signature]))

    if (changed.size === 0) return
    flashedKeys.value = changed
    clearTimeout(timer)
    timer = setTimeout(() => {
      flashedKeys.value = new Set()
    }, duration)
  }, { immediate: true })

  onScopeDispose(() => clearTimeout(timer))

  return { flashedKeys }
}
