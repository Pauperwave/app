// test\unit\composables\tournaments\rounds\useRoundTimerEngine.test.ts
import { useLocalStorage } from '@vueuse/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startRoundPreCountdown } from '~/composables/tournaments/rounds/useRoundTimerEngine'

const NOW = 1_800_000_000_000

describe('startRoundPreCountdown', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts the pre phase now, with no bonus minutes', () => {
    startRoundPreCountdown(2)

    expect(localStorage.getItem('round-timer-phase-2')).toBe('pre')
    expect(localStorage.getItem('round-timer-start-2')).toBe(String(NOW))
    expect(localStorage.getItem('round-timer-bonus-2')).toBe('0')
  })

  it('overwrites a finished timer left under the same round number', () => {
    localStorage.setItem('round-timer-phase-1', 'ended')
    localStorage.setItem('round-timer-start-1', '123')
    localStorage.setItem('round-timer-bonus-1', '5')

    startRoundPreCountdown(1)

    expect(localStorage.getItem('round-timer-phase-1')).toBe('pre')
    expect(localStorage.getItem('round-timer-start-1')).toBe(String(NOW))
    expect(localStorage.getItem('round-timer-bonus-1')).toBe('0')
  })

  it('is read back by the engine refs with the same keys and types', () => {
    startRoundPreCountdown(3)

    const phase = useLocalStorage('round-timer-phase-3', 'ended')
    const startTime = useLocalStorage<number | null>('round-timer-start-3', null)
    const timeBonus = useLocalStorage<number>('round-timer-bonus-3', 9)

    expect(phase.value).toBe('pre')
    expect(Number(startTime.value)).toBe(NOW)
    expect(timeBonus.value).toBe(0)
  })
})
