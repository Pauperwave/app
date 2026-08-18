// app\composables\events\useEventsTableColumns.ts
// fallow-ignore-file code-duplication -- mirrors useTournamentsTableColumns.ts's
// status-badge column shape on purpose; expected to diverge once real Supabase
// tables land
import { h } from 'vue'
import { UBadge } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { Event } from '~/types'
import DateWithRelativeTooltip from '~/components/ui/DateWithRelativeTooltip.vue'

export function useEventsTableColumns() {
  const { t } = useI18n()

  const columnHeaders: Record<string, string> = {
    status: t('event.columns.status'),
    name: t('event.columns.name'),
    startDate: t('event.columns.startDate'),
    tournamentCount: t('event.columns.tournamentCount'),
    organizer: t('event.columns.organizer'),
    location: t('event.columns.location')
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
      cell: ({ row }) =>
        h(DateWithRelativeTooltip, { isoString: row.original.startDate, time: false })
    },
    {
      accessorKey: 'tournamentCount',
      header: ({ column }) => sortableHeader(t('event.columns.tournamentCount'), column),
      cell: ({ row }) => row.original.tournamentCount
    },
    {
      accessorKey: 'organizer',
      header: t('event.columns.organizer')
    },
    {
      accessorKey: 'location',
      header: t('event.columns.location')
    }
  ]

  return { columns, columnHeaders }
}
