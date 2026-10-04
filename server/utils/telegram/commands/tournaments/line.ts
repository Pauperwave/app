// server\utils\telegram\commands\tournaments\line.ts
import { it } from 'date-fns/locale'

import { FormattedString } from '@grammyjs/parse-mode'

import type { RegistrationStatus } from './queries'
import { ICONS } from '~~/server/utils/telegram/icons'

// Single source for how a tournament reads in a Telegram list line, shared by leghe.ts and
// calendario.ts
export const STATUS_ICON: Record<string, string> = {
  draft: ICONS.statusDraft,
  registration_open: ICONS.statusRegistrationOpen,
  in_progress: ICONS.statusInProgress,
  completed: ICONS.statusCompleted,
  cancelled: ICONS.statusCancelled,
  // A shop-organized tournament (Magman etc.), tracked for visibility only (see isExternalOrganizer
  // in detail.ts)
  external: ICONS.statusExternal
}

export function statusIcon(status: string): string {
  return STATUS_ICON[status] ?? '•'
}

export function stageLabel(stageNumber: number | null): string {
  return stageNumber ? ` — ${stageNumber}ª tappa` : ''
}

// Unlike statusIcon() (the tournament's status), this reflects the linked chat's own registration
// to that tournament, for personalized views (calendario.ts rows, iscrizioni.ts where every row is
// a registration)
export function personalIcon(registration: RegistrationStatus): string {
  if (registration === 'checked_in') return ICONS.registrationCheckedIn
  if (registration === 'registered') return ICONS.registrationRegistered
  return ICONS.registrationNone
}

// "Icon + bold name + stage" header shared by the tournament detail view and prossimo.ts's card.
// Returns a FormattedString (see format.ts); the button-label helpers below stay plain strings, as
// captions carry no entities.
export function tournamentHeader(
  status: string, name: string, stageNumber: number | null
): FormattedString {
  return fmt`${statusIcon(status)} ${FormattedString.b(name)}${stageLabel(stageNumber)}`
}

// Full date+time header shared by detail.ts's message and prossimo.ts's card
export function formatTournamentDateTime(startsAt: string): string {
  return formatTelegramDate(startsAt, 'EEEE d MMMM \'alle\' HH:mm', { locale: it })
}
