// server\utils\telegram\commands\tournaments\line.ts
import { it } from 'date-fns/locale'

import { FormattedString } from '@grammyjs/parse-mode'

import type { RegistrationStatus } from './queries'
import { ICONS } from '../../icons'

// Single source for how a tournament reads in a Telegram list line —
// shared by leghe.ts and calendario.ts's own per-day lists.
export const STATUS_ICON: Record<string, string> = {
  draft: ICONS.statusDraft,
  registration_open: ICONS.statusRegistrationOpen,
  in_progress: ICONS.statusInProgress,
  completed: ICONS.statusCompleted,
  cancelled: ICONS.statusCancelled,
  // A shop-organized tournament (Magman etc.), tracked for schedule
  // visibility only — see isExternalOrganizer in tournament/detail.ts.
  external: ICONS.statusExternal
}

export function statusIcon(status: string): string {
  return STATUS_ICON[status] ?? '•'
}

export function stageLabel(stageNumber: number | null): string {
  return stageNumber ? ` — ${stageNumber}ª tappa` : ''
}

// Unlike statusIcon() (the tournament's own status), this reflects the
// linked chat's own registration to that specific tournament — shown
// wherever a personalized view makes more sense than the tournament's
// general status (calendario.ts's per-tournament rows, iscrizioni.ts's
// own list — every row there is a registration by definition).
export function personalIcon(registration: RegistrationStatus): string {
  if (registration === 'checked_in') return ICONS.registrationCheckedIn
  if (registration === 'registered') return ICONS.registrationRegistered
  return ICONS.registrationNone
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

// Full date+time header shared by tournament/detail.ts's single-tournament
// message and prossimo.ts's next-tournament card.
export function formatTournamentDateTime(startsAt: string): string {
  return formatTelegramDate(startsAt, 'EEEE d MMMM \'alle\' HH:mm', { locale: it })
}
