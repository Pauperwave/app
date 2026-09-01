// test\unit\utils\associates\isMinor.test.ts
import { describe, expect, it, vi } from 'vitest'
import { isMinor } from '~/utils/associates/isMinor'

describe('isMinor', () => {
  it('defaults to false when born_date is unknown', () => {
    expect(isMinor(null)).toBe(false)
    expect(isMinor(undefined)).toBe(false)
  })

  it('is true for someone under 18', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 1))
    expect(isMinor(new Date(2010, 0, 2))).toBe(true)
    vi.useRealTimers()
  })

  it('is false for someone who just turned 18', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 1))
    expect(isMinor(new Date(2008, 0, 1))).toBe(false)
    vi.useRealTimers()
  })
})
