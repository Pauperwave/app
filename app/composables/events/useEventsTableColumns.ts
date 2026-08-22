// app\composables\events\useEventsTableColumns.ts
// fallow-ignore-file code-duplication -- mirrors useLeaguesTableColumns.ts's
// status-badge/select/actions column shape on purpose
import { h } from 'vue'
import { EditIconButton, UBadge } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { Event } from '~/types'
import type { Selection } from '~/composables/useSelection'
import DateWithRelativeTooltip from '~/components/ui/DateWithRelativeTooltip.vue'

// selection/onEdit threaded through rather than read from a composable here,
// since that state (useSelection.ts/useEventsRowActions.ts) is owned by the
// page, not this file — same convention as useLeaguesTableColumns.ts.
export function useEventsTableColumns(
  selection: Selection<number>,
  onEdit: (event: Event) => void
) {
  const { t } = useI18n()

  const selectColumn = useGroupedSelectColumn<Event>(selection)

  const columnHeaders: Record<string, string> = {
    status: t('event.columns.status'),
    name: t('event.columns.name'),
    startDate: t('event.columns.startDate'),
    tournamentCount: t('event.columns.tournamentCount'),
    organizer: t('event.columns.organizer'),
    location: t('event.columns.location'),
    actions: t('event.columns.actions')
  }

  const columns: TableColumn<Event>[] = [
    selectColumn,
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
    },
    {
      id: 'actions',
      header: t('event.columns.actions'),
      // stopPropagation: the row itself also navigates on click (UTable's
      // @select, see events/index.vue) — without this, clicking the edit
      // button would open the edit modal AND navigate away underneath it.
      cell: ({ row }) => h(EditIconButton, {
        label: t('event.rowActions.edit'),
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
