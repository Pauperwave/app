// app\composables\events\useEventsTableColumns.ts
// fallow-ignore-file code-duplication -- mirrors useLeaguesTableColumns.ts's
// status-badge/select/actions column shape on purpose
import { h } from 'vue'
import { differenceInCalendarDays } from 'date-fns'
import type { Row } from '@tanstack/vue-table'
import {
  BadgesLocationBadge, BadgesOrganizerBadge, EditIconButton, ImageOffPlaceholder, UBadge, UIcon, UProgress
} from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { Event } from '~/types'
import type { Selection } from '~/composables/useSelection'
import DateWithRelativeTooltip from '~/components/ui/DateWithRelativeTooltip.vue'

// A group-header row's status cell: expand chevron, status badge, event count.
function statusGroupHeaderCell(row: Row<Event>, status: Event['status'], label: string) {
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
      color: eventStatusColor(status),
      variant: 'subtle',
      icon: EVENT_STATUS_ICONS[status]
    }, () => label),
    h(UBadge, { color: 'neutral', variant: 'subtle', size: 'sm' }, () => String(row.subRows.length))
  ])
}

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
    image: t('event.columns.image'),
    status: t('event.columns.status'),
    name: t('event.columns.name'),
    startDate: t('event.columns.startDate'),
    endDate: t('event.columns.endDate'),
    duration: t('event.columns.duration'),
    tournamentCount: t('event.columns.tournamentCount'),
    organizer: t('event.columns.organizer'),
    location: t('event.columns.location'),
    locationCity: t('event.columns.city'),
    actions: t('event.columns.actions')
  }

  const columns: TableColumn<Event>[] = [
    selectColumn,
    {
      accessorKey: 'image',
      header: t('event.columns.image'),
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
      header: ({ column }) => sortableHeader(t('event.columns.status'), column),
      cell: ({ row, getValue }) => {
        if (row.getIsGrouped()) {
          const status = getValue<Event['status']>()
          return statusGroupHeaderCell(row, status, t(`event.status.${status}`))
        }
        return h(UBadge, {
          color: eventStatusColor(row.original.status),
          variant: 'subtle',
          icon: EVENT_STATUS_ICONS[row.original.status]
        }, () => t(`event.status.${row.original.status}`))
      }
    },
    {
      accessorKey: 'name',
      header: ({ column }) => sortableHeader(t('event.columns.name'), column),
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : h('span', { class: 'font-medium' }, row.original.name)
    },
    {
      accessorKey: 'startDate',
      header: ({ column }) => sortableHeader(t('event.columns.startDate'), column),
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : h(DateWithRelativeTooltip, { isoString: row.original.startDate, time: false })
    },
    {
      accessorKey: 'endDate',
      header: ({ column }) => sortableHeader(t('event.columns.endDate'), column),
      cell: ({ row }) => row.getIsGrouped() || !row.original.endDate
        ? null
        : h(DateWithRelativeTooltip, { isoString: row.original.endDate, time: false })
    },
    {
      id: 'duration',
      // Inclusive calendar days; blank without an end date. Unsortable: it's
      // derived, and sorting by start/end already covers it.
      header: t('event.columns.duration'),
      enableSorting: false,
      cell: ({ row }) => {
        const { startDate, endDate } = row.original
        if (row.getIsGrouped() || !endDate) return null
        return t('event.duration', differenceInCalendarDays(new Date(endDate), new Date(startDate)) + 1)
      }
    },
    {
      accessorKey: 'tournamentCount',
      header: ({ column }) => sortableHeader(t('event.columns.tournamentCount'), column),
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
      accessorKey: 'organizer',
      header: ({ column }) => sortableHeader(t('event.columns.organizer'), column),
      cell: ({ row }) => row.getIsGrouped() || !row.original.organizer
        ? null
        : h(BadgesOrganizerBadge, { organizer: row.original.organizer })
    },
    {
      accessorKey: 'location',
      header: ({ column }) => sortableHeader(t('event.columns.location'), column),
      cell: ({ row }) => row.getIsGrouped() || !row.original.location
        ? null
        : h(BadgesLocationBadge, {
          location: row.original.location,
          locationAddress: row.original.locationAddress,
          mapsUrl: row.original.locationMapsUrl
        })
    },
    {
      accessorKey: 'locationCity',
      header: ({ column }) => sortableHeader(t('event.columns.city'), column),
      cell: ({ row }) => row.getIsGrouped() ? null : row.original.locationCity
    },
    {
      id: 'actions',
      header: t('event.columns.actions'),
      // stopPropagation: the row itself also navigates on click (UTable's
      // @select, see events/index.vue) — without this, clicking the edit
      // button would open the edit modal AND navigate away underneath it.
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : h(EditIconButton, {
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
