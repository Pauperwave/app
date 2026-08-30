// app\utils\tournaments\defaultRoundCount.ts
// Per-format default round count (unlike useSwissRoundCount.ts's player-
// count-based calculation, which is a different, unrelated rule) — user
// request, 2026-08-31: Pauper/Premodern/Draft always default to 4 rounds.
// Every format not listed here (Commander included) falls back to
// DEFAULT_ROUND_COUNT.
const DEFAULT_ROUND_COUNT = 2

const ROUND_COUNT_BY_FORMAT: Record<string, number> = {
  Draft: 4,
  Pauper: 4,
  Premodern: 4
}

export function defaultRoundCountForFormat(formatName: string | undefined): number {
  if (!formatName) return DEFAULT_ROUND_COUNT
  return ROUND_COUNT_BY_FORMAT[formatName] ?? DEFAULT_ROUND_COUNT
}
