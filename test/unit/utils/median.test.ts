// test\unit\utils\median.test.ts
import { describe, expect, it } from 'vitest'
import { median } from '~/utils/median'

describe('median', () => {
  it('returns null for an empty array', () => {
    expect(median([])).toBeNull()
  })

  it('returns the middle value for an odd-length array', () => {
    expect(median([3, 1, 2])).toBe(2)
  })

  it('averages the two middle values for an even-length array', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })

  it('does not mutate the input array', () => {
    const values = [3, 1, 2]
    median(values)
    expect(values).toEqual([3, 1, 2])
  })

  it('handles a single-value array', () => {
    expect(median([5])).toBe(5)
  })
})
