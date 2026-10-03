// app\composables\useRowUpdateFlash.ts
// Briefly flags rows whose data just changed ("just updated" flash), like useChangeFlash.ts but
// keyed by an arbitrary string signature: there is no single up/down value to compare (a standings
// row can change rank/points/tiebreaks at once). No gain/loss distinction, one neutral tint. The
// first signature an item is seen with never flashes, only later changes
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
