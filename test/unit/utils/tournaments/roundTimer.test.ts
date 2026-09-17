// test\unit\utils\tournaments\roundTimer.test.ts
import { describe, expect, it } from 'vitest'
import {
  calculateResumeStartTime, calculateRemainingSeconds, calculateTotalSeconds,
  clampSubtractedBonus, formatDuration, isTimerExpired, isTimerPaused,
  wouldSubtractExpireTimer
} from '~/utils/tournaments/roundTimer'

describe('calculateTotalSeconds', () => {
  it('sums base minutes and bonus minutes in seconds', () => {
    expect(calculateTotalSeconds(75, 0)).toBe(4500)
    expect(calculateTotalSeconds(75, 5)).toBe(4800)
  })

  it('handles negative bonus minutes (a subtracted timer)', () => {
    expect(calculateTotalSeconds(75, -10)).toBe(3900)
  })
})

describe('calculateRemainingSeconds', () => {
  it('subtracts elapsed from total', () => {
    expect(calculateRemainingSeconds(100, 40)).toBe(60)
  })

  it('clamps to 0 when elapsed exceeds total', () => {
    expect(calculateRemainingSeconds(100, 150)).toBe(0)
  })

  it('only clamps the lower bound -- negative elapsed adds to remaining', () => {
    expect(calculateRemainingSeconds(100, -10)).toBe(110)
  })
})

describe('isTimerExpired', () => {
  it('is true only at exactly 0 remaining seconds', () => {
    expect(isTimerExpired(0)).toBe(true)
    expect(isTimerExpired(1)).toBe(false)
  })
})

describe('isTimerPaused', () => {
  it('is true when started, not running, and not expired', () => {
    expect(isTimerPaused(false, true, false)).toBe(true)
  })

  it('is false when never started', () => {
    expect(isTimerPaused(false, false, false)).toBe(false)
  })

  it('is false when still running', () => {
    expect(isTimerPaused(true, true, false)).toBe(false)
  })

  it('is false when already expired', () => {
    expect(isTimerPaused(false, true, true)).toBe(false)
  })
})

describe('calculateResumeStartTime', () => {
  it('back-calculates the start timestamp from elapsed seconds', () => {
    expect(calculateResumeStartTime(10_000, 5)).toBe(5000)
  })

  it('returns the current time when nothing has elapsed yet', () => {
    expect(calculateResumeStartTime(10_000, 0)).toBe(10_000)
  })
})

describe('clampSubtractedBonus', () => {
  it('subtracts normally when the result stays above the floor', () => {
    expect(clampSubtractedBonus(10, 5, 75)).toBe(5)
  })

  it('floors at -durationMinutes so total duration never goes negative', () => {
    expect(clampSubtractedBonus(-70, 20, 75)).toBe(-75)
  })

  it('allows the bonus to go negative as long as it stays within the floor', () => {
    expect(clampSubtractedBonus(0, 10, 75)).toBe(-10)
  })
})

describe('wouldSubtractExpireTimer', () => {
  it('is false when the timer is already expired (not a new consequence)', () => {
    expect(wouldSubtractExpireTimer(4500, 0, 5, 75)).toBe(false)
  })

  it('is true when the subtraction would bring remaining time to exactly 0', () => {
    // 75 min duration, 0 bonus, 74 min elapsed -> 60s remaining; subtracting
    // 1 bonus minute drops total to 74 min, which now equals elapsed.
    expect(wouldSubtractExpireTimer(74 * 60, 0, 1, 75)).toBe(true)
  })

  it('is false when plenty of time remains after the subtraction', () => {
    expect(wouldSubtractExpireTimer(0, 0, 5, 75)).toBe(false)
  })
})

describe('formatDuration', () => {
  it('formats under an hour as MM:SS', () => {
    expect(formatDuration(0)).toBe('00:00')
    expect(formatDuration(65)).toBe('01:05')
    expect(formatDuration(3599)).toBe('59:59')
  })

  it('formats an hour or more as H:MM:SS', () => {
    expect(formatDuration(3600)).toBe('1:00:00')
    expect(formatDuration(3725)).toBe('1:02:05')
  })
})
