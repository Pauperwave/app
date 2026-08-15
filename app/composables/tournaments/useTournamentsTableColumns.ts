// app\composables\tournaments\useTournamentsTableColumns.ts
// fallow-ignore-file code-duplication -- mirrors useEventsTableColumns.ts's
// status-badge column shape on purpose; expected to diverge once real Supabase
// tables land
import { h } from 'vue'
import { UBadge, UButton } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { Tournament } from '~/types'

// Pure config except for `onEdit` (depends only on t() otherwise) — same
// reasoning as useWantedCardsTableColumns.ts. `onEdit` is threaded through
// rather than read from a composable here, since the edit-modal state
// (useTournamentsRowActions.ts) is owned by the page, not this file.
export function useTournamentsTableColumns(onEdit: (tournament: Tournament) => void) {
  const { t } = useI18n()

  const columnHeaders: Record<string, string> = {
    status: t('tournament.columns.status'),
    name: t('tournament.columns.name'),
    startDate: t('tournament.columns.startDate'),
    format: t('tournament.columns.format'),
    location: t('tournament.columns.location'),
    registeredPlayers: t('tournament.columns.registeredPlayers'),
    entryFee: t('tournament.columns.entryFee'),
    actions: t('tournament.columns.actions')
  }

  const columns: TableColumn<Tournament>[] = [
    {
      accessorKey: 'status',
      header: ({ column }) => sortableHeader(t('tournament.columns.status'), column),
      cell: ({ row }) => h(UBadge, {
        color: tournamentStatusColor(row.original.status),
        variant: 'subtle',
        icon: TOURNAMENT_STATUS_ICONS[row.original.status]
      }, () => t(`tournament.status.${row.original.status}`))
    },
    {
      accessorKey: 'name',
      header: ({ column }) => sortableHeader(t('tournament.columns.name'), column),
      cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.name)
    },
    {
      accessorKey: 'startDate',
      header: ({ column }) => sortableHeader(t('tournament.columns.startDate'), column),
      cell: ({ row }) => new Date(row.original.startDate).toLocaleString('it-IT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    {
      accessorKey: 'format',
      header: ({ column }) => sortableHeader(t('tournament.columns.format'), column)
    },
    {
      accessorKey: 'location',
      header: t('tournament.columns.location')
    },
    {
      accessorKey: 'registeredPlayers',
      header: ({ column }) => sortableHeader(t('tournament.columns.registeredPlayers'), column)
    },
    {
      accessorKey: 'entryFee',
      header: ({ column }) => sortableHeader(t('tournament.columns.entryFee'), column),
      cell: ({ row }) => `${(row.original.entryFee ?? 0).toFixed(2)} €`
    },
    {
      id: 'actions',
      header: t('tournament.columns.actions'),
      // stopPropagation: the row itself also navigates on click (UTable's
      // @select, see tournaments/index.vue) — without this, clicking the
      // edit button would open the edit modal AND navigate away underneath it.
      cell: ({ row }) => h(UButton, {
        'icon': ICONS.edit,
        'color': 'neutral',
        'variant': 'ghost',
        'size': 'xs',
        'aria-label': t('tournament.rowActions.edit'),
        'onClick': (e: MouseEvent) => {
          e.stopPropagation()
          onEdit(row.original)
        }
      })
    }
  ]

  return { columns, columnHeaders }
}
