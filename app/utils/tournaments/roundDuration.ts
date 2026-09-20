// app\utils\tournaments\roundDuration.ts
// Round duration a tournament starts with, by format family. The values live
// in /settings; these are the ones used until they load.
export interface RoundDurationRules {
  commanderRoundMinutes: number
  oneVsOneRoundMinutes: number
}

export const DEFAULT_ROUND_DURATION_RULES: RoundDurationRules = {
  commanderRoundMinutes: 75,
  oneVsOneRoundMinutes: 50
}

// Multiplayer pod formats; every other format plays 1v1 matches.
const MULTIPLAYER_FORMATS = ['Commander', 'Cubo Commander']

export function is1v1FormatName(formatName: string | undefined): boolean {
  return !!formatName && !MULTIPLAYER_FORMATS.includes(formatName)
}

export function defaultRoundMinutesForFormat(
  formatName: string | undefined,
  rules: RoundDurationRules = DEFAULT_ROUND_DURATION_RULES
): number {
  return is1v1FormatName(formatName) ? rules.oneVsOneRoundMinutes : rules.commanderRoundMinutes
}
