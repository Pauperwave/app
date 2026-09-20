// app\utils\tournaments\defaultRoundCount.ts
// Per-format default round count (unlike useSwissRoundCount.ts's player-
// count-based calculation, which is a different, unrelated rule) — user
// request, 2026-08-31: Pauper/Premodern/Draft always default to 4 rounds.
// Every format not listed falls back to `defaultRoundCount`. The rules live in
// /settings; these are the values used until they load.
export interface RoundCountRules {
  defaultRoundCount: number
  roundCountByFormat: Record<string, number>
}

export const DEFAULT_ROUND_COUNT_RULES: RoundCountRules = {
  defaultRoundCount: 2,
  roundCountByFormat: { Draft: 4, Pauper: 4, Premodern: 4 }
}

export function defaultRoundCountForFormat(
  formatName: string | undefined,
  rules: RoundCountRules = DEFAULT_ROUND_COUNT_RULES
): number {
  if (!formatName) return rules.defaultRoundCount
  return rules.roundCountByFormat[formatName] ?? rules.defaultRoundCount
}
