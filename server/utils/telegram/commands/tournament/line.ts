// server\utils\telegram\commands\tournament\line.ts
import { it } from 'date-fns/locale'

import { FormattedString } from '@grammyjs/parse-mode'

// Single source for how a tournament reads in a Telegram list line —
// shared by leghe.ts and calendario.ts's own per-day lists.
export const STATUS_ICON: Record<string, string> = {
  draft: '📋',
  registration_open: '📝',
  in_progress: '🔄',
  completed: '✅',
  cancelled: '❌',
  // A shop-organized tournament (Magman etc.), tracked for schedule
  // visibility only — see isExternalOrganizer in tournament/detail.ts.
  external: '🏪'
}

export function statusIcon(status: string): string {
  return STATUS_ICON[status] ?? '•'
}

export function stageLabel(stageNumber: number | null): string {
  return stageNumber ? ` — ${stageNumber}ª tappa` : ''
}

// "Icon + bold name + stage" header shared by the single-tournament detail
// view and prossimo.ts's card. Returns a FormattedString (entities, not
// markdown) — see format.ts's comment on why raw values never need escaping.
// The button-label helpers below stay plain strings regardless — button
// captions never carry entities.
export function tournamentHeader(
  status: string, name: string, stageNumber: number | null
): FormattedString {
  return fmt`${statusIcon(status)} ${FormattedString.b(name)}${stageLabel(stageNumber)}`
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
}: TournamentLineInput): FormattedString {
  const location = locationName ? `\n📍 ${locationName}` : ''
  return fmt`${statusIcon(status)} ${name}${stageSuffix}${location}`
}

// Same shape as tournamentLine(), for the button label. `icon` is passed in
// (not derived from status) since callers vary — leghe.ts's buttons show
// registration state, not tournament status. Can exceed Telegram's 64-char
// button cap on a long name; no good truncation point, left as-is.
export function tournamentButtonLabel(
  icon: string, date: string, stageNumber: number | null, name: string
): string {
  return `${icon} ${date}${stageLabel(stageNumber)} — ${name}`
}

// Short date for tournamentButtonLabel() in a nearby-scoped list —
// leghe.ts spans a whole league's calendar, so it uses a longer format.
export function formatButtonDate(startsAt: string): string {
  return formatTelegramDate(startsAt, 'd MMM', { locale: it })
}

// Full date+time header shared by tournament/detail.ts's single-tournament
// message and prossimo.ts's next-tournament card.
export function formatTournamentDateTime(startsAt: string): string {
  return formatTelegramDate(startsAt, 'EEEE d MMMM \'alle\' HH:mm', { locale: it })
}
