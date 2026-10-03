// app\utils\tournaments\defaultRoundCount.ts
// Round count a tournament starts with, by format family (a different rule from
// useSwissRoundCount.ts's player-count one). Same split as roundDuration.ts. The values live in
// /settings; these are used until they load.
export interface RoundCountRules {
  commanderRoundCount: number
  oneVsOneRoundCount: number
}

export const DEFAULT_ROUND_COUNT_RULES: RoundCountRules = {
  commanderRoundCount: 2,
  oneVsOneRoundCount: 4
}

export function defaultRoundCountForFormat(
  formatName: string | undefined,
  rules: RoundCountRules = DEFAULT_ROUND_COUNT_RULES
): number {
  return is1v1FormatName(formatName) ? rules.oneVsOneRoundCount : rules.commanderRoundCount
}
