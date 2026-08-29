// app\utils\transactions\transactionCells.ts
// Extracted out of useTransactionsTableColumns.ts and
// useAssociateTransactionsTableColumns.ts (2026-08-29, fallow:dupes) — both
// files had byte-identical event_name/gettoni cell rendering, differing only
// in a `row.getIsGrouped()` guard the associate-scoped table doesn't need
// (it has no grouping). Each caller wraps its own guard around these.
import { h } from 'vue'
import type { Transaction, Tournament } from '~/types'
import { TournamentsStageLabel, UBadge, UButton, UIcon, UTooltip } from '#components'
import { parseTransactionNotes } from '~/utils/transactions/transactionNotes'

// tournament/event checked first, ahead of event_name's own raw text: for
// Token Purchase rows event_name is just "8 gettoni" (see
// transactionGettoni.ts), never a real name, but tournament/event.name is
// always the real linked entity regardless of payment_type — a Gettoni
// purchase has a real event behind it and should link to it like Event Fee
// does (user request, 2026-08-27), not blank out just because its own
// event_name text isn't a name at all. ck_payment_type_event_link (migration
// 20260825220000) guarantees exactly one of tournament_uuid/event_uuid is
// set whenever payment_type is Tournament Fee/Event Fee/Token Purchase — no
// raw-text fallback needed, tournament/event here can't both be unresolved.
export function transactionEventNameCell(
  transaction: Pick<Transaction, 'tournament' | 'event'>,
  tournamentsByUuid: ComputedRef<Map<string, Tournament>>
) {
  const { tournament, event } = transaction
  if (tournament) {
    // Real tournament.name, not the historical import's event_name text
    // (e.g. "PAUPER TAPPA 6" vs the tournament's actual "Pauper"), plus its
    // league-relative stage number — the same "Nª tappa" label the
    // /tournaments page itself shows (user request, 2026-08-22/23).
    const stageNumber = tournamentsByUuid.value.get(tournament.uuid)?.stageNumber
    return h(UButton, {
      to: tournamentDetailUrl(tournament),
      icon: PAYMENT_TYPE_BADGE_CONFIG['Tournament Fee'].icon,
      size: 'xs',
      color: 'neutral',
      variant: 'subtle'
    }, () => [
      tournament.name,
      stageNumber ? h(TournamentsStageLabel, { number: stageNumber, class: '!text-xs' }) : null
    ])
  }
  // event is guaranteed set here by ck_payment_type_event_link whenever
  // tournament isn't — this `if` is TS narrowing, not a real fallback branch
  // (the constraint rules out neither being set).
  if (event) {
    return h(UButton, {
      to: `/events/${event.uuid}`,
      label: event.name,
      icon: PAYMENT_TYPE_BADGE_CONFIG['Event Fee'].icon,
      size: 'xs',
      color: 'neutral',
      variant: 'subtle'
    })
  }
  return null
}

export function transactionGettoniCell(count: number | null) {
  if (count === null) return null
  return h(UBadge, { variant: 'subtle', color: 'warning', icon: ICONS.coins, label: String(count) })
}

// unknownEmailTooltip passed in rather than a useI18n() call here — a plain
// util, not a composable, since useTransactionsTableColumns.ts's caller
// already has its own `t` in scope.
export function transactionNotesCell(notes: string, unknownEmailTooltip: string) {
  const { hasUnknownEmail, cleanNotes } = parseTransactionNotes(notes)
  if (!hasUnknownEmail) return cleanNotes
  return h('div', { class: 'flex items-center gap-1.5' }, [
    h(UTooltip, { text: unknownEmailTooltip }, () => h(UIcon, {
      name: ICONS.incognito,
      class: 'size-4 text-dimmed shrink-0'
    })),
    cleanNotes
  ])
}
