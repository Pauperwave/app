// app\composables\tournaments\useTournamentsTableColumns.ts
// fallow-ignore-file code-duplication -- mirrors useEventsTableColumns.ts's
// status-badge column shape on purpose; expected to diverge once real Supabase
// tables land
import { h } from 'vue'
import type { Row } from '@tanstack/vue-table'
import {
  BadgesFormatBadge, BadgesLeagueBadge, BadgesLocationBadge,
  EditIconButton, ImageOffPlaceholder, UBadge, UIcon
} from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { Tournament } from '~/types'
import type { Selection } from '~/composables/useSelection'

// Shared by the three groupable columns (league/format/location, 2026-08-17
// user request) — a group-header row's cell: expand chevron, the group's
// label, and its tournament count. Sits alongside (not replacing) each
// column's own leaf-row cell, which renders the badge instead.
function groupHeaderCell(row: Row<Tournament>, label: string) {
  return h('button', {
    type: 'button',
    class: 'flex items-center gap-1.5 font-medium cursor-pointer',
    onClick: () => row.toggleExpanded()
  }, [
    h(UIcon, {
      name: row.getIsExpanded() ? ICONS.chevronDown : ICONS.chevronRight,
      class: 'size-4'
    }),
    h('span', label),
    h(UBadge, { color: 'neutral', variant: 'subtle', size: 'sm' }, () => String(row.subRows.length))
  ])
}

// Pure config except for `selection`/`onEdit` (depends only on t() otherwise) —
// same reasoning as useWantedCardsTableColumns.ts. Both are threaded through
// rather than read from a composable here, since that state
// (useSelection.ts/useTournamentsRowActions.ts) is owned by the page, not
// this file.
export function useTournamentsTableColumns(
  selection: Selection<number>,
  onEdit: (tournament: Tournament) => void
) {
  const { t } = useI18n()

  // Bound to the shared selectedIds Set (useSelection.ts), not UTable's own
  // row-selection state — grouping (by league/format/location) needs a
  // group's checkbox to reflect/drive all its subRows at once, same
  // reasoning as useWantedCardsTableColumns.ts.
  const selectColumn = useGroupedSelectColumn<Tournament>(selection)

  const columnHeaders: Record<string, string> = {
    image: t('tournament.columns.image'),
    league: t('tournament.columns.league'),
    name: t('tournament.columns.name'),
    status: t('tournament.columns.status'),
    startDate: t('tournament.columns.startDate'),
    format: t('tournament.columns.format'),
    location: t('tournament.columns.location'),
    registeredPlayers: t('tournament.columns.registeredPlayers'),
    entryFee: t('tournament.columns.entryFee'),
    actions: t('tournament.columns.actions')
  }

  const columns: TableColumn<Tournament>[] = [
    selectColumn,
    {
      accessorKey: 'image',
      header: t('tournament.columns.image'),
      enableSorting: false,
      meta: { class: { th: 'w-px', td: 'w-px' } },
      cell: ({ row }) => {
        if (row.getIsGrouped()) return null
        return row.original.image
          ? h('img', {
            src: row.original.image,
            alt: row.original.name,
            class: 'size-8 rounded object-cover'
          })
          : h(ImageOffPlaceholder, { class: 'size-8 rounded', iconClass: 'size-4' })
      }
    },
    {
      accessorKey: 'league',
      header: ({ column }) => sortableHeader(t('tournament.columns.league'), column),
      // Sorts groups by number of tournaments (subRows), same reasoning as
      // useWantedCardsTableColumns.ts's player column.
      sortingFn: (rowA, rowB) => (rowA.subRows?.length ?? 0) - (rowB.subRows?.length ?? 0),
      cell: ({ row, getValue }) => {
        const league = getValue<string | null>()
        if (row.getIsGrouped()) return groupHeaderCell(row, league ?? t('tournament.columns.noLeague'))
        if (!league || !row.original.leagueUuid) return null
        return h(BadgesLeagueBadge, { league, leagueUuid: row.original.leagueUuid })
      }
    },
    {
      accessorKey: 'name',
      header: ({ column }) => sortableHeader(t('tournament.columns.name'), column),
      cell: ({ row }) => row.getIsGrouped() ? null : h('span', { class: 'font-medium' }, row.original.name)
    },
    {
      accessorKey: 'status',
      header: ({ column }) => sortableHeader(t('tournament.columns.status'), column),
      cell: ({ row }) => {
        if (row.getIsGrouped()) return null
        return h(UBadge, {
          color: tournamentStatusColor(row.original.status),
          variant: 'subtle',
          icon: TOURNAMENT_STATUS_ICONS[row.original.status]
        }, () => t(`tournament.status.${row.original.status}`))
      }
    },
    {
      accessorKey: 'startDate',
      header: ({ column }) => sortableHeader(t('tournament.columns.startDate'), column),
      cell: ({ row }) => {
        if (row.getIsGrouped()) return null
        return new Date(row.original.startDate).toLocaleString('it-IT', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }
    },
    {
      accessorKey: 'format',
      header: ({ column }) => sortableHeader(t('tournament.columns.format'), column),
      sortingFn: (rowA, rowB) => (rowA.subRows?.length ?? 0) - (rowB.subRows?.length ?? 0),
      cell: ({ row, getValue }) => {
        const format = getValue<string>()
        if (row.getIsGrouped()) return groupHeaderCell(row, format)
        return h(BadgesFormatBadge, { format })
      }
    },
    {
      accessorKey: 'location',
      header: ({ column }) => sortableHeader(t('tournament.columns.location'), column),
      sortingFn: (rowA, rowB) => (rowA.subRows?.length ?? 0) - (rowB.subRows?.length ?? 0),
      cell: ({ row, getValue }) => {
        const location = getValue<string | null>()
        if (row.getIsGrouped()) return groupHeaderCell(row, location ?? t('tournament.columns.noLocation'))
        if (!location) return null
        return h(BadgesLocationBadge, {
          location,
          locationAddress: row.original.locationAddress,
          mapsUrl: row.original.locationMapsUrl
        })
      }
    },
    {
      accessorKey: 'registeredPlayers',
      header: ({ column }) => sortableHeader(t('tournament.columns.registeredPlayers'), column),
      cell: ({ row }) => row.getIsGrouped() ? null : row.original.registeredPlayers
    },
    {
      accessorKey: 'entryFee',
      header: ({ column }) => sortableHeader(t('tournament.columns.entryFee'), column),
      cell: ({ row }) => row.getIsGrouped() ? null : `${(row.original.entryFee ?? 0).toFixed(2)} €`
    },
    {
      id: 'actions',
      header: t('tournament.columns.actions'),
      // stopPropagation: the row itself also navigates on click (UTable's
      // @select, see tournaments/index.vue) — without this, clicking the
      // edit button would open the edit modal AND navigate away underneath it.
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : h(EditIconButton, {
          label: t('tournament.rowActions.edit'),
          size: 'xs',
          onClick: (e: MouseEvent) => {
            e.stopPropagation()
            onEdit(row.original)
          }
        })
    }
  ]

  return { columns, columnHeaders }
}
