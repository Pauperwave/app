// app\composables\leagues\useLeaguesTableColumns.ts
import { h } from 'vue'
import type { Row } from '@tanstack/vue-table'
import {
  BadgesFormatBadge, EditIconButton, ImageOffPlaceholder, LeaguesRulesetBadge,
  UBadge, UIcon, UProgress
} from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { League } from '~/types'
import type { Selection } from '~/composables/useSelection'
import DateWithRelativeTooltip from '~/components/ui/DateWithRelativeTooltip.vue'

// A group-header row's status cell: expand chevron, status badge, league count.
function statusGroupHeaderCell(row: Row<League>, status: League['status'], label: string) {
  return h('button', {
    type: 'button',
    class: 'flex items-center gap-1.5 font-medium cursor-pointer',
    onClick: () => row.toggleExpanded()
  }, [
    h(UIcon, {
      name: row.getIsExpanded() ? ICONS.chevronDown : ICONS.chevronRight,
      class: 'size-4'
    }),
    h(UBadge, {
      color: leagueStatusColor(status),
      variant: 'subtle',
      icon: LEAGUE_STATUS_ICONS[status]
    }, () => label),
    h(UBadge, { color: 'neutral', variant: 'subtle', size: 'sm' }, () => String(row.subRows.length))
  ])
}

// Same shape as useTournamentsTableColumns.ts: selection/onEdit are threaded through, since that
// state (useSelection.ts/useLeaguesRowActions.ts) is owned by the page
export function useLeaguesTableColumns(
  selection: Selection<number>,
  onEdit: (league: League) => void
) {
  const { t } = useI18n()

  // No grouping in this table, but the shared implementation degrades to a plain select column when
  // `grouping` isn't wired (like useTournamentsTableColumns.ts), avoiding duplicated checkbox logic
  const selectColumn = useGroupedSelectColumn<League>(selection)

  const columnHeaders: Record<string, string> = {
    image: t('league.columns.image'),
    status: t('league.columns.status'),
    name: t('league.columns.name'),
    startDate: t('league.columns.startDate'),
    endDate: t('league.columns.endDate'),
    tournamentCount: t('league.columns.tournamentCount'),
    formats: t('league.columns.formats'),
    ruleset: t('league.columns.ruleset'),
    actions: t('league.columns.actions')
  }

  const columns: TableColumn<League>[] = [
    selectColumn,
    {
      accessorKey: 'image',
      header: t('league.columns.image'),
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
      accessorKey: 'status',
      header: ({ column }) => sortableHeader(t('league.columns.status'), column),
      cell: ({ row, getValue }) => {
        if (row.getIsGrouped()) {
          const status = getValue<League['status']>()
          return statusGroupHeaderCell(row, status, t(`league.status.${status}`))
        }
        return h(UBadge, {
          color: leagueStatusColor(row.original.status),
          variant: 'subtle',
          icon: LEAGUE_STATUS_ICONS[row.original.status]
        }, () => t(`league.status.${row.original.status}`))
      }
    },
    {
      accessorKey: 'name',
      header: ({ column }) => sortableHeader(t('league.columns.name'), column),
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : h('span', { class: 'font-medium' }, row.original.name)
    },
    {
      accessorKey: 'startDate',
      header: ({ column }) => sortableHeader(t('league.columns.startDate'), column),
      // Derived from its tournaments (recomputeLeagueDates, ADR): effectively "when the league's
      // activity starts", date-only like useLeaguesQuery.ts falling back to created_at
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : h(DateWithRelativeTooltip, { isoString: row.original.startDate, time: false })
    },
    {
      id: 'endDate',
      // League has no end column of its own — its last tournament's date.
      accessorFn: league => league.tournamentDateRange?.end ?? '',
      header: ({ column }) => sortableHeader(t('league.columns.endDate'), column),
      cell: ({ row }) => row.getIsGrouped() || !row.original.tournamentDateRange
        ? null
        : h(DateWithRelativeTooltip, {
          isoString: row.original.tournamentDateRange.end,
          time: false
        })
    },
    {
      accessorKey: 'tournamentCount',
      header: ({ column }) => sortableHeader(t('league.columns.tournamentCount'), column),
      cell: ({ row }) => {
        if (row.getIsGrouped()) return null
        const { completedTournamentCount, tournamentCount } = row.original
        return h('div', { class: 'flex flex-col gap-1 min-w-32' }, [
          h('span', { class: 'text-xs text-muted' }, t('league.progress', {
            completed: completedTournamentCount,
            total: tournamentCount
          })),
          h(UProgress, {
            modelValue: tournamentCount
              ? Math.round((completedTournamentCount / tournamentCount) * 100)
              : 0,
            size: 'sm'
          })
        ])
      }
    },
    {
      id: 'formats',
      // Same 2 badges + "+N" cap as leagues/list/Card.vue.
      header: t('league.columns.formats'),
      enableSorting: false,
      cell: ({ row }) => {
        if (row.getIsGrouped()) return null
        const { tournamentFormats } = row.original
        const extra = tournamentFormats.length - 2
        return h('div', { class: 'flex items-center gap-1.5' }, [
          ...tournamentFormats.slice(0, 2).map(format =>
            h(BadgesFormatBadge, { format, icon: ICONS.gameplay })),
          extra > 0 ? h(UBadge, { color: 'neutral', variant: 'subtle' }, () => `+${extra}`) : null
        ])
      }
    },
    {
      accessorKey: 'ruleset',
      header: t('league.columns.ruleset'),
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : h(LeaguesRulesetBadge, { league: row.original })
    },
    {
      id: 'actions',
      header: t('league.columns.actions'),
      // stopPropagation: the row also navigates on click (UTable's @select, see leagues/index.vue),
      // so the edit button would otherwise open the modal AND navigate
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : h(EditIconButton, {
          label: t('league.rowActions.edit'),
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
