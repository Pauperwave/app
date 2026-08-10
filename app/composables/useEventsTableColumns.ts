// app\composables\useEventsTableColumns.ts
import { h } from 'vue'
import { UBadge } from '#components'
import { format } from 'date-fns'
import type { TableColumn } from '@nuxt/ui'
import type { Event } from '~/types'

export function useEventsTableColumns() {
  const { t } = useI18n()

  const columnHeaders: Record<string, string> = {
    status: t('event.columns.status'),
    name: t('event.columns.name'),
    startDate: t('event.columns.startDate'),
    tournamentCount: t('event.columns.tournamentCount')
  }

  const columns: TableColumn<Event>[] = [
    {
      accessorKey: 'status',
      header: ({ column }) => sortableHeader(t('event.columns.status'), column),
      cell: ({ row }) => h(UBadge, {
        color: eventStatusColor(row.original.status),
        variant: 'subtle',
        icon: EVENT_STATUS_ICONS[row.original.status]
      }, () => t(`event.status.${row.original.status}`))
    },
    {
      accessorKey: 'name',
      header: ({ column }) => sortableHeader(t('event.columns.name'), column),
      cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.name)
    },
    {
      accessorKey: 'startDate',
      header: ({ column }) => sortableHeader(t('event.columns.startDate'), column),
      cell: ({ row }) => format(new Date(row.original.startDate), 'dd/MM/yyyy')
    },
    {
      accessorKey: 'tournamentCount',
      header: ({ column }) => sortableHeader(t('event.columns.tournamentCount'), column),
      cell: ({ row }) => row.original.tournamentCount
    }
  ]

  return { columns, columnHeaders }
}
