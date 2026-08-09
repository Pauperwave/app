// app\composables\useLeaguesTableColumns.ts
import { h } from 'vue'
import { UBadge, UButton } from '#components'
import type { Column } from '@tanstack/vue-table'
import type { TableColumn } from '@nuxt/ui'
import type { League } from '~/types'

export function useLeaguesTableColumns() {
  const { t } = useI18n()

  function sortableHeader(label: string, column: Column<League, unknown>) {
    const isSorted = column.getIsSorted()
    return h(UButton, {
      label,
      color: 'neutral',
      variant: 'ghost',
      class: '-mx-2.5',
      icon: isSorted
        ? (isSorted === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow')
        : 'i-lucide-arrow-up-down',
      onClick: () => column.toggleSorting(isSorted === 'asc')
    })
  }

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
