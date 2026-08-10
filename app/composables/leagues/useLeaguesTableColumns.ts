// app\composables\leagues\useLeaguesTableColumns.ts
import { h } from 'vue'
import { UBadge } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { League } from '~/types'

export function useLeaguesTableColumns() {
  const { t } = useI18n()

  const columnHeaders: Record<string, string> = {
    status: t('league.columns.status'),
    name: t('league.columns.name'),
    tournamentCount: t('league.columns.tournamentCount')
  }

  const columns: TableColumn<League>[] = [
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
      accessorKey: 'tournamentCount',
      header: ({ column }) => sortableHeader(t('league.columns.tournamentCount'), column),
      cell: ({ row }) => t('league.progress', {
        completed: row.original.completedTournamentCount,
        total: row.original.tournamentCount
      })
    }
  ]

  return { columns, columnHeaders }
}
