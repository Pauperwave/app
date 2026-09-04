// app\composables\locations\useLocationsTableColumns.ts
import { h } from 'vue'
import { UBadge, UButton, LocationsTypeBadge } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { Location } from '~/types'

// Pure config except for `onEdit` (depends only on t() otherwise) — same
// reasoning as useTournamentsTableColumns.ts.
export function useLocationsTableColumns(onEdit: (location: Location) => void) {
  const { t } = useI18n()

  const columnHeaders: Record<string, string> = {
    name: t('location.columns.name'),
    address: t('location.columns.address'),
    city: t('location.columns.city'),
    phone: t('location.columns.phone'),
    website: t('location.columns.website'),
    actions: t('location.columns.actions')
  }

  const columns: TableColumn<Location>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => sortableHeader(t('location.columns.name'), column),
      cell: ({ row }) => h('div', { class: 'flex items-center gap-2' }, [
        h('span', { class: 'font-medium' }, row.original.name),
        h(LocationsTypeBadge, { isShop: row.original.isShop }),
        row.original.temporarilyClosed
          ? h(UBadge, {
            color: 'warning', variant: 'subtle', icon: ICONS.warning
          }, () => t('location.card.temporarilyClosed'))
          : null
      ])
    },
    {
      accessorKey: 'address',
      header: t('location.columns.address')
    },
    {
      accessorKey: 'city',
      header: ({ column }) => sortableHeader(t('location.columns.city'), column),
      cell: ({ row }) => `${row.original.city} (${row.original.province})`
    },
    {
      accessorKey: 'phone',
      header: t('location.columns.phone'),
      cell: ({ row }) => row.original.phone ?? '—'
    },
    {
      accessorKey: 'website',
      header: t('location.columns.website'),
      cell: ({ row }) => row.original.website ?? '—'
    },
    {
      id: 'actions',
      header: t('location.columns.actions'),
      cell: ({ row }) => h(UButton, {
        'icon': ICONS.edit,
        'color': 'neutral',
        'variant': 'ghost',
        'size': 'xs',
        'aria-label': t('location.rowActions.edit'),
        'onClick': (e: MouseEvent) => {
          e.stopPropagation()
          onEdit(row.original)
        }
      })
    }
  ]

  return { columns, columnHeaders }
}
