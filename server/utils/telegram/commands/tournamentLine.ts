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

// The "icon + bold name + stage" header shared by calendario.ts's single
// tournament detail view and prossimo.ts's next-tournament card — both show
// one tournament at a time, with the date/location as separate lines below
// rather than folded into this one (unlike tournamentLine()'s list rows).
export function tournamentHeader(status: string, name: string, stageNumber: number | null): string {
  return `${statusIcon(status)} *${name}*${stageLabel(stageNumber)}`
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

// Same "icon - date - tappa - nome" shape as tournamentLine(), for the
// InlineKeyboard button label sitting under these same lists — `icon` is
// passed in rather than derived from `status` because callers vary on what
// the icon should mean (leghe.ts's buttons show the chat's own
// registration state, not the tournament's status). Telegram caps a
// button's text at 64 characters; a long date + tappa + tournament name
// combination can exceed that, but there's no good truncation point that
// wouldn't also hide the name, so this is left as-is.
export function tournamentButtonLabel(
  icon: string, date: string, stageNumber: number | null, name: string
): string {
  return `${icon} ${date}${stageLabel(stageNumber)} — ${name}`
}
