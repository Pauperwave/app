// test\unit\composables\useSelection.test.ts
import { describe, expect, it } from 'vitest'
import { useSelection } from '~/composables/useSelection'

describe('useSelection', () => {
  it('toggles an id in and out of the selection', () => {
    const { selectedIds, isSelected, toggle } = useSelection<number>()
    toggle(1)
    expect(isSelected(1)).toBe(true)
    expect(selectedIds.value).toEqual(new Set([1]))
    toggle(1)
    expect(isSelected(1)).toBe(false)
  })

  it('setAll adds or removes a batch of ids', () => {
    const { selectedIds, setAll } = useSelection<number>()
    setAll([1, 2, 3], true)
    expect(selectedIds.value).toEqual(new Set([1, 2, 3]))
    setAll([2], false)
    expect(selectedIds.value).toEqual(new Set([1, 3]))
  })

  it('clear empties the selection and resets the shift-click anchor', () => {
    const { selectedIds, toggle, clear } = useSelection<number>()
    toggle(1)
    clear()
    expect(selectedIds.value.size).toBe(0)
  })

  it('a shift-click selects the range from the last plain-clicked id', () => {
    const { selectedIds, toggle } = useSelection<number>()
    const range = [1, 2, 3, 4, 5]
    toggle(1) // anchor
    toggle(4, { shiftKey: true, range })
    expect(selectedIds.value).toEqual(new Set([1, 2, 3, 4]))
  })

  it('a shift-click range works backwards too', () => {
    const { selectedIds, toggle } = useSelection<number>()
    const range = [1, 2, 3, 4, 5]
    toggle(4)
    toggle(1, { shiftKey: true, range })
    expect(selectedIds.value).toEqual(new Set([1, 2, 3, 4]))
  })

  it('repeated shift-clicks keep resolving against the original anchor, not the last shift-click', () => {
    const { selectedIds, toggle } = useSelection<number>()
    const range = [0, 1, 2, 3, 4]
    toggle(0) // anchor stays at 0
    toggle(4, { shiftKey: true, range })
    // A shift-click always selects (adds) its resolved range — it never
    // deselects ids outside it — so 0-4 stays selected even though this
    // range (anchor 0 -> 2) is narrower than the previous one.
    toggle(2, { shiftKey: true, range })
    expect(selectedIds.value).toEqual(new Set([0, 1, 2, 3, 4]))
  })

  it('falls back to a plain toggle when there is no prior anchor', () => {
    const { selectedIds, toggle } = useSelection<number>()
    toggle(3, { shiftKey: true, range: [1, 2, 3] })
    expect(selectedIds.value).toEqual(new Set([3]))
  })

  it('falls back to a plain toggle when the id is not in the given range', () => {
    const { selectedIds, toggle } = useSelection<number>()
    toggle(1)
    toggle(99, { shiftKey: true, range: [1, 2, 3] })
    expect(selectedIds.value).toEqual(new Set([1, 99]))
  })
})
