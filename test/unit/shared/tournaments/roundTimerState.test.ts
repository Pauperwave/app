// test\unit\shared\tournaments\roundTimerState.test.ts
import { describe, expect, it } from 'vitest'
import {
  formatRemaining,
  resolveRoundTimer,
  type RoundTimerSnapshot
} from '../../../../shared/utils/tournaments/roundTimerState'

const START = 1_000_000_000_000

function makeSnapshot(overrides: Partial<RoundTimerSnapshot> = {}): RoundTimerSnapshot {
  return {
    phase: 'round',
    isRunning: true,
    phaseStartedAtMs: START,
    pausedElapsedSeconds: 0,
    preSeconds: 180,
    roundSeconds: 3000,
    turnsSeconds: 900,
    ...overrides
  }
}

describe('resolveRoundTimer', () => {
  it('counts down a running phase from its start instant', () => {
    expect(resolveRoundTimer(makeSnapshot(), START + 600_000)).toEqual({
      phase: 'round', isRunning: true, remainingSeconds: 2400
    })
  })

  it('shows a paused phase frozen at its elapsed time, whatever the clock says', () => {
    const paused = makeSnapshot({
      isRunning: false, phaseStartedAtMs: null, pausedElapsedSeconds: 1200
    })
    expect(resolveRoundTimer(paused, START + 99_999_999)).toEqual({
      phase: 'round', isRunning: false, remainingSeconds: 1800
    })
  })

  it('moves on to the turns once the round elapsed, carrying the overflow', () => {
    expect(resolveRoundTimer(makeSnapshot(), START + (3000 + 100) * 1000)).toEqual({
      phase: 'turns', isRunning: true, remainingSeconds: 800
    })
  })

  it('cascades through several phases elapsed while nobody wrote an update', () => {
    const snapshot = makeSnapshot({ phase: 'pre', phaseStartedAtMs: START })
    const resolved = resolveRoundTimer(snapshot, START + (180 + 3000 + 50) * 1000)
    expect(resolved).toEqual({ phase: 'turns', isRunning: true, remainingSeconds: 850 })
  })

  it('ends after the turns and stops running', () => {
    expect(resolveRoundTimer(makeSnapshot(), START + (3000 + 900 + 5) * 1000)).toEqual({
      phase: 'ended', isRunning: false, remainingSeconds: 0
    })
  })

  it('never advances a paused phase on its own', () => {
    const paused = makeSnapshot({
      isRunning: false, phaseStartedAtMs: null, pausedElapsedSeconds: 3000
    })
    expect(resolveRoundTimer(paused, START + 10_000_000).phase).toBe('round')
  })

  it('keeps an ended timer ended', () => {
    expect(resolveRoundTimer(makeSnapshot({ phase: 'ended' }), START)).toEqual({
      phase: 'ended', isRunning: false, remainingSeconds: 0
    })
  })

  it('never goes negative when the reader clock is behind the start', () => {
    expect(resolveRoundTimer(makeSnapshot(), START - 5_000).remainingSeconds).toBe(3000)
  })

  it('treats a running flag without a start instant as stopped', () => {
    const odd = makeSnapshot({ phaseStartedAtMs: null, pausedElapsedSeconds: 60 })
    expect(resolveRoundTimer(odd, START)).toEqual({
      phase: 'round', isRunning: false, remainingSeconds: 2940
    })
  })
})

describe('formatRemaining', () => {
  it('formats minutes and zero-padded seconds', () => {
    expect(formatRemaining(0)).toBe('0:00')
    expect(formatRemaining(65)).toBe('1:05')
    expect(formatRemaining(3000)).toBe('50:00')
  })
})
