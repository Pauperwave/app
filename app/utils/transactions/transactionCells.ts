// app\utils\transactions\transactionCells.ts
// Event-name and gettoni cell rendering shared by useTransactionsTableColumns.ts and
// useAssociateTransactionsTableColumns.ts; each caller wraps its own `row.getIsGrouped()` guard
// (the associate-scoped table has no grouping)
import { h } from 'vue'
import type { Transaction, Tournament } from '~/types'
import { TournamentsStageLabel, UBadge, UButton, UIcon, UTooltip } from '#components'
import { parseTransactionNotes } from '~/utils/transactions/transactionNotes'

// The linked tournament/event comes first, ahead of event_name's raw text: Token Purchase rows have
// event_name like "8 gettoni" (transactionGettoni.ts) but a real linked entity, and should link to
// it like Event Fee. ck_payment_type_event_link guarantees exactly one of
// tournament_uuid/event_uuid for Tournament Fee/Event Fee/Token Purchase, so no raw-text fallback
// is needed
export function transactionEventNameCell(
  transaction: Pick<Transaction, 'tournament' | 'event'>,
  tournamentsByUuid: ComputedRef<Map<string, Tournament>>
) {
  const { tournament, event } = transaction
  if (tournament) {
    // The linked tournament's real name (not the import's event_name text), plus its
    // league-relative "Nª tappa" label as on /tournaments
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
  // event is always set here when tournament isn't (ck_payment_type_event_link): this `if` only
  // narrows for TS
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

// unknownEmailTooltip is passed in rather than calling useI18n(): this is a plain util and the
// caller already has `t`
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
