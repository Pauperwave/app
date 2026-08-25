// app\composables\transactions\useTransactionsTableColumns.ts
import {
  AssociateTag, UBadge, UButton, UIcon, UTooltip
} from '#components'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { Transaction } from '~/types'
import type { Selection } from '~/composables/useSelection'
import DateWithRelativeTooltip from '~/components/ui/DateWithRelativeTooltip.vue'
import PaymentTypeBadge from '~/components/ui/PaymentTypeBadge.vue'
import PaymentMethodBadge from '~/components/ui/PaymentMethodBadge.vue'
import RowActionsMenu from '~/components/ui/RowActionsMenu.vue'
import TournamentsStageLabel from '~/components/tournaments/StageLabel.vue'

export const transactionsColumnHeaders = (t: (key: string) => string) => ({
  id: t('transaction.columns.id'),
  payer: t('transaction.columns.payer'),
  payment_date: t('transaction.columns.paymentDate'),
  payment_type: t('transaction.columns.paymentType'),
  payment_amount: t('transaction.columns.paymentAmount'),
  payment_method: t('transaction.columns.paymentMethod'),
  received_by: t('transaction.columns.receivedBy'),
  event_name: t('transaction.columns.event'),
  gettoni: t('transaction.columns.gettoni'),
  receipt: t('transaction.columns.receipt'),
  notes: t('transaction.columns.notes'),
  createdBy: t('transaction.columns.createdBy'),
  createdAt: t('transaction.columns.createdAt'),
  updatedBy: t('transaction.columns.updatedBy'),
  updatedAt: t('transaction.columns.updatedAt'),
  actions: t('transaction.columns.actions')
} as const)

// selection: threaded through rather than read from a composable here, same
// reasoning as useTournamentsTableColumns.ts/useWantedCardsTableColumns.ts —
// that state (useSelection.ts) is owned by the page. Grouping (by payer) is
// on here, unlike tournaments, so the select column comes from
// useGroupedSelectColumn.ts (a group's checkbox drives all its subRows),
// not tournaments' simpler ungrouped one.
export function useTransactionsTableColumns(
  selection: Selection<number>,
  rowContextMenuItems: (transaction: Transaction) => DropdownMenuItem[]
) {
  const { t } = useI18n()

  const columnHeaders = transactionsColumnHeaders(t)

  const amountFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

  // Reuses the exact same league-relative stage numbering the /tournaments
  // page itself shows (assignTournamentStageNumbers, computed once over the
  // whole league) instead of re-deriving it here — Pinia Colada dedupes the
  // fetch against the 'tournaments' key if that page is already open.
  const { data: allTournaments } = useTournamentsQuery()
  const tournamentsByUuid = computed(() =>
    new Map((allTournaments.value ?? []).map(tournament => [tournament.uuid, tournament])))

  const selectColumn = useGroupedSelectColumn<Transaction>(selection)

  const columns: TableColumn<Transaction>[] = [
    selectColumn,
    {
      accessorKey: 'id',
      header: ({ column }) => sortableHeader(columnHeaders.id, column),
      meta: { class: { th: 'whitespace-nowrap text-right', td: 'whitespace-nowrap font-mono text-dimmed text-right' } },
      cell: ({ row }) => row.getIsGrouped() ? null : row.original.id
    },
    {
      id: 'payer',
      // Own accessorFn (not accessorKey) since the payer name isn't a single
      // raw column on the row. Needed as a real accessor (not just a synthetic
      // cell) so grouping (getGroupedRowModel) has a value to group by — same
      // reasoning as wanted-cards' player column.
      accessorFn: transactionPayerName,
      header: ({ column }) => sortableHeader(columnHeaders.payer, column),
      // Sorts groups by number of transactions (subRows), not alphabetically —
      // more useful once the table is grouped by payer.
      sortingFn: (rowA, rowB) => (rowA.subRows?.length ?? 0) - (rowB.subRows?.length ?? 0),
      cell: ({ row, getValue }) => {
        const name = getValue<string>()
        const associateUuid = row.original.associate?.uuid ?? null
        if (row.getIsGrouped()) {
          return h('button', {
            type: 'button',
            class: 'flex items-center gap-1.5 font-medium cursor-pointer',
            onClick: () => row.toggleExpanded()
          }, [
            h(UIcon, {
              name: row.getIsExpanded() ? ICONS.chevronDown : ICONS.chevronRight,
              class: 'size-4'
            }),
            h(AssociateTag, { name: name || columnHeaders.payer, associateUuid }),
            h(UBadge, { color: 'neutral', variant: 'subtle', size: 'sm' }, () => String(row.subRows.length))
          ])
        }
        if (!name) return ''
        return h(AssociateTag, { name, associateUuid })
      }
    },
    {
      accessorKey: 'payment_date',
      header: ({ column }) => sortableHeader(columnHeaders.payment_date, column),
      meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : h(DateWithRelativeTooltip, { isoString: row.original.payment_date })
    },
    {
      accessorKey: 'payment_type',
      header: ({ column }) => sortableHeader(columnHeaders.payment_type, column),
      meta: { class: { th: 'whitespace-nowrap text-center', td: 'whitespace-nowrap text-center' } },
      cell: ({ row }) =>
        row.getIsGrouped() ? null : h(PaymentTypeBadge, { type: row.original.payment_type })
    },
    {
      accessorKey: 'payment_amount',
      header: ({ column }) => sortableHeader(columnHeaders.payment_amount, column),
      meta: { class: { th: 'whitespace-nowrap text-right', td: 'whitespace-nowrap font-mono text-right' } },
      cell: ({ row }) =>
        row.getIsGrouped() ? null : amountFormatter.format(row.original.payment_amount)
    },
    {
      accessorKey: 'payment_method',
      header: columnHeaders.payment_method,
      meta: { class: { th: 'whitespace-nowrap text-center', td: 'whitespace-nowrap text-center' } },
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : h(PaymentMethodBadge, { method: row.original.payment_method })
    },
    {
      accessorKey: 'received_by',
      header: columnHeaders.received_by,
      meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap' } },
      // No associateUuid — staff members aren't reliably resolvable to an
      // associate record by name alone, so this is just name+avatar, no
      // membership popover (see AssociateTag.vue).
      cell: ({ row }) =>
        row.getIsGrouped() ? null : h(AssociateTag, { name: row.original.received_by })
    },
    {
      accessorKey: 'event_name',
      header: columnHeaders.event_name,
      meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap' } },
      cell: ({ row }) => {
        if (row.getIsGrouped()) return null
        const eventName = row.original.event_name
        // Not a real event name for these rows — see transactionGettoni.ts —
        // shown in its own "Gettoni" column instead.
        if (parseGettoniCount(eventName) !== null) return ''
        if (!eventName) return ''

        // Links to the tournament/event's own detail page — ck_payment_type_event_link
        // (migration 20260825220000) guarantees exactly one of tournament_uuid/
        // event_uuid is set whenever payment_type is Tournament Fee/Event Fee/
        // Token Purchase, which is the only way event_name is non-null in the
        // first place (Association Fee/Donation never set it) — no raw-text
        // fallback needed, tournament/event here can't both be unresolved.
        // Same UButton for both — a plain NuxtLink+icon for the event case
        // read as a visually different affordance than the tournament one
        // even though both do the same thing (user request, 2026-08-23).
        const { tournament, event } = row.original
        if (tournament) {
          // Real tournament.name, not the historical import's event_name text
          // (e.g. "PAUPER TAPPA 6" vs the tournament's actual "Pauper"), plus
          // its league-relative stage number — the same "Nª tappa" label the
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
        // tournament isn't — this `if` is TS narrowing, not a real fallback
        // branch (the constraint rules out neither being set).
        if (event) {
          return h(UButton, {
            to: `/events/${event.uuid}`,
            label: eventName,
            icon: PAYMENT_TYPE_BADGE_CONFIG['Event Fee'].icon,
            size: 'xs',
            color: 'neutral',
            variant: 'subtle'
          })
        }
        return null
      }
    },
    {
      id: 'gettoni',
      accessorFn: row => parseGettoniCount(row.event_name),
      header: columnHeaders.gettoni,
      meta: { class: { th: 'whitespace-nowrap text-center', td: 'whitespace-nowrap text-center' } },
      cell: ({ row, getValue }) => {
        if (row.getIsGrouped()) return null
        const count = getValue<number | null>()
        if (count === null) return null
        return h(UBadge, { variant: 'subtle', color: 'warning', icon: ICONS.coins, label: String(count) })
      }
    },
    {
      accessorKey: 'receipt_ref',
      header: columnHeaders.receipt,
      meta: { class: { th: 'whitespace-nowrap text-center', td: 'whitespace-nowrap text-center' } },
      cell: ({ row }) => {
        if (row.getIsGrouped()) return null
        const receiptRef = row.original.receipt_ref
        if (!receiptRef) return null
        return h(UBadge, { variant: 'subtle', color: 'neutral', icon: ICONS.receipt, label: receiptRef })
      }
    },
    {
      accessorKey: 'notes',
      header: columnHeaders.notes,
      cell: ({ row }) => {
        if (row.getIsGrouped()) return null
        const { hasUnknownEmail, cleanNotes } = parseTransactionNotes(row.original.notes)
        if (!hasUnknownEmail) return cleanNotes
        return h('div', { class: 'flex items-center gap-1.5' }, [
          h(UTooltip, { text: t('transaction.columns.unknownEmailTooltip') }, () => h(UIcon, {
            name: ICONS.incognito,
            class: 'size-4 text-dimmed shrink-0'
          })),
          cleanNotes
        ])
      }
    },
    {
      accessorKey: 'createdBy',
      header: columnHeaders.createdBy,
      cell: ({ row }) => row.getIsGrouped() || !row.original.createdBy
        ? null
        : h(AssociateTag, { name: row.original.createdBy })
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => sortableHeader(columnHeaders.createdAt, column),
      meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : h(DateWithRelativeTooltip, { isoString: row.original.created_at })
    },
    {
      accessorKey: 'updatedBy',
      header: columnHeaders.updatedBy,
      cell: ({ row }) => row.getIsGrouped() || !row.original.updatedBy
        ? null
        : h(AssociateTag, { name: row.original.updatedBy })
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => sortableHeader(columnHeaders.updatedAt, column),
      meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : h(DateWithRelativeTooltip, { isoString: row.original.updated_at })
    },
    {
      id: 'actions',
      header: columnHeaders.actions,
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : h(RowActionsMenu, { items: rowContextMenuItems(row.original) })
    }
  ]

  return { columnHeaders, columns }
}
