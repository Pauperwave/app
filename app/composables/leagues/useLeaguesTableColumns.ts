// app\composables\leagues\useLeaguesTableColumns.ts
import { h } from 'vue'
import type { Row } from '@tanstack/vue-table'
import { EditIconButton, UBadge, UIcon, UProgress } from '#components'
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

// Same shape as useTournamentsTableColumns.ts — selection/onEdit threaded
// through rather than read from a composable here, since that state
// (useSelection.ts/useLeaguesRowActions.ts) is owned by the page, not this
// file.
export function useLeaguesTableColumns(
  selection: Selection<number>,
  onEdit: (league: League) => void
) {
  const { t } = useI18n()

  // No grouping in this table (unlike tournaments), but the shared
  // implementation degrades to a plain select column when `grouping` is
  // never wired — same convention as useTournamentsTableColumns.ts, and
  // avoids duplicating its header/cell checkbox logic (fallow:dupes,
  // 2026-08-17).
  const selectColumn = useGroupedSelectColumn<League>(selection)

  const columnHeaders: Record<string, string> = {
    status: t('league.columns.status'),
    name: t('league.columns.name'),
    startDate: t('league.columns.startDate'),
    endDate: t('league.columns.endDate'),
    tournamentCount: t('league.columns.tournamentCount'),
    ruleset: t('league.columns.ruleset'),
    actions: t('league.columns.actions')
  }

  const columns: TableColumn<League>[] = [
    selectColumn,
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
      // Derived from its tournaments (recomputeLeagueDates, 2026-08-16 ADR),
      // so this is effectively "when does this league's activity start" —
      // date-only, same rationale as useLeaguesQuery.ts falling back to
      // created_at rather than showing a time-of-day that was never real.
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
        : h(DateWithRelativeTooltip, { isoString: row.original.tournamentDateRange.end, time: false })
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
            modelValue: tournamentCount ? Math.round((completedTournamentCount / tournamentCount) * 100) : 0,
            size: 'sm'
          })
        ])
      }
    },
    {
      accessorKey: 'ruleset',
      header: t('league.columns.ruleset'),
      cell: ({ row }) => row.getIsGrouped() ? null : row.original.ruleset
    },
    {
      id: 'actions',
      header: t('league.columns.actions'),
      // stopPropagation: the row itself also navigates on click (UTable's
      // @select, see leagues/index.vue) — without this, clicking the edit
      // button would open the edit modal AND navigate away underneath it.
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
