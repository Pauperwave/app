// server\utils\telegram\commands\tournamentLine.ts

// Single source for how a tournament reads in a Telegram list line —
// leghe.ts's per-league tournament list and calendario.ts's per-day
// calendar list both rendered their own "icon + name + stage + location"
// string independently before this; now both call tournamentLine().
export const STATUS_ICON: Record<string, string> = {
  draft: '📋',
  registration_open: '📝',
  in_progress: '🔄',
  completed: '✅',
  cancelled: '❌'
}

export function statusIcon(status: string): string {
  return STATUS_ICON[status] ?? '•'
}

export function stageLabel(stageNumber: number | null): string {
  return stageNumber ? ` — ${stageNumber}ª tappa` : ''
}

interface TournamentLineInput {
  status: string
  name: string
  // Left out (default '') where the caller already shows the stage
  // elsewhere on its own line (leghe.ts's per-tournament date line).
  stageSuffix?: string
  locationName?: string | null
}

export function tournamentLine({
  status, name, stageSuffix = '', locationName
}: TournamentLineInput): string {
  const location = locationName ? `\n📍 ${locationName}` : ''
  return `${statusIcon(status)} ${name}${stageSuffix}${location}`
}
