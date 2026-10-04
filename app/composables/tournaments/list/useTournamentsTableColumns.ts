// app\composables\tournaments\list\useTournamentsTableColumns.ts
// fallow-ignore-file code-duplication -- status-badge column mirrors useEventsTableColumns.ts
import { h } from 'vue'
import { format } from 'date-fns'
import {
  BadgesEventBadge, BadgesFormatBadge, BadgesLeagueBadge, BadgesOrganizerBadge,
  EditIconButton, ImageOffPlaceholder, TournamentsEntryFeeBadge,
  TournamentsLocationChangeBadge, TournamentsStageLabel, TournamentsStatusBadge
} from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { Tournament } from '~/types'
import type { Selection } from '~/composables/useSelection'
import DateWithRelativeTooltip from '~/components/ui/DateWithRelativeTooltip.vue'

// The league column's leaf cell: the league badge, or nothing for a tournament outside any league
function leagueBadge(tournament: Tournament) {
  if (!tournament.league || !tournament.leagueUuid) return null
  return h(BadgesLeagueBadge, { league: tournament.league, leagueUuid: tournament.leagueUuid })
}

// Pure config except for `selection`/`onEdit` (otherwise only t()), like
// useWantedCardsTableColumns.ts: both are threaded through, since that state
// (useSelection.ts/useTournamentsRowActions.ts) is owned by the page
export function useTournamentsTableColumns(
  selection: Selection<number>,
  onEdit: (tournament: Tournament) => void
) {
  const { t } = useI18n()

  // Bound to the shared selectedIds Set (useSelection.ts), not UTable's row-selection state:
  // grouping (league/format/location) needs a group's checkbox to drive all its subRows
  const selectColumn = useGroupedSelectColumn<Tournament>(selection)

  const columnHeaders: Record<string, string> = {
    image: t('tournament.columns.image'),
    league: t('tournament.columns.league'),
    event: t('tournament.columns.event'),
    name: t('tournament.columns.name'),
    status: t('tournament.columns.status'),
    startDate: t('tournament.columns.startDate'),
    startTime: t('tournament.columns.startTime'),
    endTime: t('tournament.columns.endTime'),
    duration: t('tournament.columns.duration'),
    format: t('tournament.columns.format'),
    location: t('tournament.columns.location'),
    organizer: t('tournament.columns.organizer'),
    roundCount: t('tournament.columns.roundCount'),
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
      sortingFn: sortGroupsBySizeElseText,
      cell: ({ row, getValue }) => row.getIsGrouped()
        ? groupHeaderCell(row, getValue<string | null>() ?? t('tournament.columns.noLeague'))
        : leagueBadge(row.original)
    },
    {
      accessorKey: 'event',
      header: ({ column }) => sortableHeader(t('tournament.columns.event'), column),
      cell: ({ row, getValue }) => {
        const event = getValue<string | null>()
        if (row.getIsGrouped() || !event || !row.original.eventUuid) return null
        return h(BadgesEventBadge, { event, eventUuid: row.original.eventUuid })
      }
    },
    {
      accessorKey: 'name',
      header: ({ column }) => sortableHeader(t('tournament.columns.name'), column),
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : h('span', { class: 'font-medium' }, [
          row.original.name,
          row.original.stageNumber
            ? h(TournamentsStageLabel, { number: row.original.stageNumber, class: 'ms-1.5' })
            : null
        ])
    },
    {
      accessorKey: 'status',
      header: ({ column }) => sortableHeader(t('tournament.columns.status'), column),
      cell: ({ row, getValue }) => {
        if (row.getIsGrouped()) {
          const status = getValue<Tournament['status']>()
          return groupHeaderCell(row, t(`tournament.status.${status}`))
        }
        return h(TournamentsStatusBadge, { tournament: row.original })
      }
    },
    {
      accessorKey: 'startDate',
      header: ({ column }) => sortableHeader(t('tournament.columns.startDate'), column),
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : h(DateWithRelativeTooltip, { isoString: row.original.startDate, time: false })
    },
    {
      id: 'startTime',
      // Not sortable: the time of day alone isn't a meaningful order, startDate covers it.
      header: t('tournament.columns.startTime'),
      enableSorting: false,
      cell: ({ row }) => row.getIsGrouped() ? null : format(new Date(row.original.startDate), 'HH:mm')
    },
    {
      id: 'endTime',
      header: t('tournament.columns.endTime'),
      enableSorting: false,
      cell: ({ row }) => row.getIsGrouped() || !row.original.endDate
        ? null
        : format(new Date(row.original.endDate), 'HH:mm')
    },
    {
      id: 'duration',
      header: t('tournament.columns.duration'),
      enableSorting: false,
      cell: ({ row }) => row.getIsGrouped() || !row.original.endDate
        ? null
        : durationLabel(row.original.startDate, row.original.endDate)
    },
    {
      accessorKey: 'format',
      header: ({ column }) => sortableHeader(t('tournament.columns.format'), column),
      sortingFn: sortGroupsBySizeElseText,
      cell: ({ row, getValue }) => {
        const format = getValue<string>()
        if (row.getIsGrouped()) return groupHeaderCell(row, format)
        return h(BadgesFormatBadge, { format, icon: ICONS.gameplay })
      }
    },
    {
      accessorKey: 'location',
      header: ({ column }) => sortableHeader(t('tournament.columns.location'), column),
      sortingFn: sortGroupsBySizeElseText,
      cell: ({ row, getValue }) => {
        const location = getValue<string | null>()
        if (row.getIsGrouped()) return groupHeaderCell(row, location ?? t('tournament.columns.noLocation'))
        return h(TournamentsLocationChangeBadge, { tournament: row.original })
      }
    },
    {
      accessorKey: 'organizer',
      header: ({ column }) => sortableHeader(t('tournament.columns.organizer'), column),
      cell: ({ row }) => row.getIsGrouped() || !row.original.organizer
        ? null
        : h(BadgesOrganizerBadge, { organizer: row.original.organizer })
    },
    {
      accessorKey: 'roundCount',
      header: ({ column }) => sortableHeader(t('tournament.columns.roundCount'), column),
      cell: ({ row }) => row.getIsGrouped() ? null : row.original.roundCount
    },
    {
      accessorKey: 'registeredPlayers',
      header: ({ column }) => sortableHeader(t('tournament.columns.registeredPlayers'), column),
      cell: ({ row }) => row.getIsGrouped() ? null : row.original.registeredPlayers
    },
    {
      accessorKey: 'entryFee',
      header: ({ column }) => sortableHeader(t('tournament.columns.entryFee'), column),
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : h(TournamentsEntryFeeBadge, { tournament: row.original })
    },
    {
      id: 'actions',
      header: t('tournament.columns.actions'),
      // stopPropagation: the row also navigates on click (UTable's @select, see
      // tournaments/index.vue), so the edit button would otherwise open the modal AND navigate
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
