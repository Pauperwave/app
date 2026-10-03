// app\composables\ui\useRovingTabindex.ts
// Roving-tabindex arrow-key navigation for a group of focusable items (e.g. a grid of cards acting
// as a radiogroup), ported from league: Tab enters/exits the group as one stop, ArrowRight/Down and
// ArrowLeft/Up (plus Home/End) move focus within it. A flat, wrapping 1D sequence rather than a 2D
// grid: the column count is responsive (2 vs 3), so "up/down a row" can't be computed without
// measuring the layout

interface FocusableItem {
  focus: () => void
}

export type RovingNavigateDirection = 'next' | 'prev' | 'first' | 'last'

export function useRovingTabindex(itemCount: MaybeRefOrGetter<number>) {
  const activeIndex = ref(0)
  const itemRefs = ref<(FocusableItem | null)[]>([])

  function setItemRef(index: number, el: FocusableItem | null) {
    itemRefs.value[index] = el
  }

  function tabindexFor(index: number): number {
    return index === activeIndex.value ? 0 : -1
  }

  function focusIndex(index: number) {
    activeIndex.value = index
    // Synchronous, not nextTick: grid items are already mounted (only their tabindex reacts to
    // activeIndex), and .focus() works whatever the tabindex
    itemRefs.value[index]?.focus()
  }

  function onNavigate(currentIndex: number, direction: RovingNavigateDirection) {
    const count = toValue(itemCount)
    if (count === 0) return

    const next = {
      next: (currentIndex + 1) % count,
      prev: (currentIndex - 1 + count) % count,
      first: 0,
      last: count - 1
    }[direction]

    focusIndex(next)
  }

  return { activeIndex, setItemRef, tabindexFor, onNavigate, focusIndex }
}
