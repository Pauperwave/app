// shared\utils\tournaments\roundTimerState.ts

// The organizer's round timer as stored in tournament_round_timers, and how a reader (the Telegram
// turns Mini App) derives "what the clock shows now" from it. Same phase sequence as the
// organizer's useRoundTimerEngine.ts: pre -> round -> turns -> ended.

export type RoundTimerPhase = 'pre' | 'round' | 'turns' | 'ended'

export interface RoundTimerSnapshot {
  phase: RoundTimerPhase
  isRunning: boolean
  // Epoch ms the current phase effectively started, pauses excluded; null while paused or stopped
  phaseStartedAtMs: number | null
  // Elapsed seconds in the current phase while it isn't running
  pausedElapsedSeconds: number
  preSeconds: number
  roundSeconds: number
  turnsSeconds: number
}

// Why the Mini App has no event timer to follow (it then falls back to its own local one)
export type RoundTimerStatus = 'ok' | 'unlinked' | 'no-table' | 'no-timer'

export interface RoundTimerResponse {
  status: RoundTimerStatus
  snapshot: RoundTimerSnapshot | null
  // The server clock, so the reader ticks on it and not on its own device's
  serverNowMs: number
}

export interface ResolvedRoundTimer {
  phase: RoundTimerPhase
  isRunning: boolean
  remainingSeconds: number
}

const NEXT_PHASE: Record<Exclude<RoundTimerPhase, 'ended'>, RoundTimerPhase> = {
  pre: 'round',
  round: 'turns',
  turns: 'ended'
}

function phaseSeconds(snapshot: RoundTimerSnapshot, phase: RoundTimerPhase): number {
  if (phase === 'pre') return snapshot.preSeconds
  if (phase === 'round') return snapshot.roundSeconds
  if (phase === 'turns') return snapshot.turnsSeconds
  return 0
}

// A running phase that elapsed since the last write moves on to the next one, carrying its
// overflow, exactly like the organizer's own timer does after a page was closed. A paused phase
// never advances on its own.
export function resolveRoundTimer(snapshot: RoundTimerSnapshot, nowMs: number): ResolvedRoundTimer {
  if (snapshot.phase === 'ended') {
    return { phase: 'ended', isRunning: false, remainingSeconds: 0 }
  }

  const isRunning = snapshot.isRunning && snapshot.phaseStartedAtMs !== null
  let phase: RoundTimerPhase = snapshot.phase
  let elapsed = isRunning && snapshot.phaseStartedAtMs !== null
    ? Math.max(0, Math.floor((nowMs - snapshot.phaseStartedAtMs) / 1000))
    : snapshot.pausedElapsedSeconds

  while (isRunning && phase !== 'ended' && elapsed >= phaseSeconds(snapshot, phase)) {
    elapsed -= phaseSeconds(snapshot, phase)
    phase = NEXT_PHASE[phase]
  }

  if (phase === 'ended') {
    return { phase, isRunning: false, remainingSeconds: 0 }
  }

  return {
    phase,
    isRunning,
    remainingSeconds: Math.max(0, phaseSeconds(snapshot, phase) - elapsed)
  }
}

export function formatRemaining(remainingSeconds: number): string {
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
