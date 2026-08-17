// app\composables\leagues\useLeaguesTableColumns.ts
import { h } from 'vue'
import { EditIconButton, UBadge, UCheckbox } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { League } from '~/types'
import type { Selection } from '~/composables/useSelection'

// Same shape as useTournamentsTableColumns.ts — selection/onEdit threaded
// through rather than read from a composable here, since that state
// (useSelection.ts/useLeaguesRowActions.ts) is owned by the page, not this
// file.
export function useLeaguesTableColumns(
  selection: Selection<number>,
  onEdit: (league: League) => void
) {
  const { t } = useI18n()

  // Captured from the checkbox's own native `click` (fires synchronously
  // before the `update:modelValue` it triggers) so a shift-click can be told
  // apart from a plain one — same convention as useTournamentsTableColumns.ts.
  let lastClickShiftKey = false

  const selectColumn: TableColumn<League> = {
    id: 'select',
    enableSorting: false,
    enableHiding: false,
    meta: { class: { th: 'w-px p-0', td: 'w-px p-0' } },
    header: ({ table: tableApi }) => {
      const ids = tableApi.getFilteredRowModel().rows.map(row => row.original.id)
      const allSelected = ids.length > 0 && ids.every(id => selection.isSelected(id))
      const someSelected = ids.some(id => selection.isSelected(id))
      return centerTableCell(h(UCheckbox, {
        'modelValue': allSelected ? true : (someSelected ? 'indeterminate' : false),
        'onUpdate:modelValue': (value: unknown) => selection.setAll(ids, !!value),
        'aria-label': t('common.selectAll')
      }))
    },
    // stopPropagation: the row itself navigates on click too (UTable's
    // @select, see leagues/index.vue) — without this, toggling the checkbox
    // would also navigate away underneath it.
    cell: ({ row, table: tableApi }) => {
      const range = tableApi.getFilteredRowModel().rows.map(r => r.original.id)
      return centerTableCell(h(UCheckbox, {
        'modelValue': selection.isSelected(row.original.id),
        'onUpdate:modelValue': () =>
          selection.toggle(row.original.id, { shiftKey: lastClickShiftKey, range }),
        'onClick': (e: MouseEvent) => {
          e.stopPropagation()
          lastClickShiftKey = e.shiftKey
        },
        'aria-label': t('common.selectRow')
      }))
    }
  }

  const columnHeaders: Record<string, string> = {
    status: t('league.columns.status'),
    name: t('league.columns.name'),
    startDate: t('league.columns.startDate'),
    tournamentCount: t('league.columns.tournamentCount'),
    ruleset: t('league.columns.ruleset'),
    actions: t('league.columns.actions')
  }

  const columns: TableColumn<League>[] = [
    selectColumn,
    {
      accessorKey: 'status',
      header: ({ column }) => sortableHeader(t('league.columns.status'), column),
      cell: ({ row }) => h(UBadge, {
        color: leagueStatusColor(row.original.status),
        variant: 'subtle',
        icon: LEAGUE_STATUS_ICONS[row.original.status]
      }, () => t(`league.status.${row.original.status}`))
    },
    {
      accessorKey: 'name',
      header: ({ column }) => sortableHeader(t('league.columns.name'), column),
      cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.name)
    },
    {
      accessorKey: 'startDate',
      header: ({ column }) => sortableHeader(t('league.columns.startDate'), column),
      // Derived from its tournaments (recomputeLeagueDates, 2026-08-16 ADR),
      // so this is effectively "when does this league's activity start" —
      // date-only, same rationale as useLeaguesQuery.ts falling back to
      // created_at rather than showing a time-of-day that was never real.
      cell: ({ row }) => new Date(row.original.startDate).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    },
    {
      accessorKey: 'tournamentCount',
      header: ({ column }) => sortableHeader(t('league.columns.tournamentCount'), column),
      cell: ({ row }) => t('league.progress', {
        completed: row.original.completedTournamentCount,
        total: row.original.tournamentCount
      })
    },
    {
      accessorKey: 'ruleset',
      header: t('league.columns.ruleset')
    },
    {
      id: 'actions',
      header: t('league.columns.actions'),
      // stopPropagation: the row itself also navigates on click (UTable's
      // @select, see leagues/index.vue) — without this, clicking the edit
      // button would open the edit modal AND navigate away underneath it.
      cell: ({ row }) => h(EditIconButton, {
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
