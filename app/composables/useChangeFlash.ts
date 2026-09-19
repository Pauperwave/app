// app\composables\useChangeFlash.ts
// Briefly flags the items whose number just changed ('gain' = went up, 'loss'
// = went down), so a list can tint them for a moment. The first value of an
// item never flashes, only later changes do.
export type ChangeFlash = 'gain' | 'loss'

export function useChangeFlash(
  items: MaybeRefOrGetter<Array<{ key: string, value: number }>>,
  duration = 900
) {
  const flashes = ref<Record<string, ChangeFlash>>({})
  let previousValues = new Map<string, number>()
  let timer: ReturnType<typeof setTimeout> | undefined

  watch(() => toValue(items).map(item => item.value), () => {
    const current = toValue(items)
    const changes: Record<string, ChangeFlash> = {}

    for (const { key, value } of current) {
      const before = previousValues.get(key)
      if (before !== undefined && before !== value) {
        changes[key] = value > before ? 'gain' : 'loss'
      }
    }
    previousValues = new Map(current.map(({ key, value }) => [key, value]))

    if (Object.keys(changes).length === 0) return
    flashes.value = changes
    clearTimeout(timer)
    timer = setTimeout(() => {
      flashes.value = {}
    }, duration)
  }, { immediate: true })

  onScopeDispose(() => clearTimeout(timer))

  return { flashes }
}
