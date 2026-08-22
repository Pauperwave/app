// app\composables\trash\useTrashTableColumns.ts
import { h } from 'vue'
import { UBadge, UButton } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { TrashItem } from '~/types'
import DateWithRelativeTooltip from '~/components/ui/DateWithRelativeTooltip.vue'

// No selection/bulk-restore column, unlike useEventsTableColumns.ts's
// pattern — a Trash page is a low-traffic admin tool, one row restored at a
// time is enough for now (YAGNI).
export function useTrashTableColumns(onRestore: (item: TrashItem) => void) {
  const { t } = useI18n()

  const columns: TableColumn<TrashItem>[] = [
    {
      accessorKey: 'entity',
      header: ({ column }) => sortableHeader(t('trash.columns.entity'), column),
      cell: ({ row }) => h(UBadge, {
        color: 'neutral',
        variant: 'subtle',
        icon: TRASH_ENTITY_ICONS[row.original.entity]
      }, () => t(`trash.entities.${row.original.entity}`))
    },
    {
      accessorKey: 'name',
      header: ({ column }) => sortableHeader(t('trash.columns.name'), column),
      cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.name)
    },
    {
      accessorKey: 'deletedAt',
      header: ({ column }) => sortableHeader(t('trash.columns.deletedAt'), column),
      cell: ({ row }) =>
        h(DateWithRelativeTooltip, { isoString: row.original.deletedAt, time: true })
    },
    {
      accessorKey: 'deletedBy',
      header: ({ column }) => sortableHeader(t('trash.columns.deletedBy'), column),
      cell: ({ row }) => row.original.deletedBy || '—'
    },
    {
      id: 'actions',
      header: t('trash.columns.actions'),
      // Labeled + outline, same style already used for every other
      // "undo"-flavored action in the app (ICONS.undo + variant: 'outline',
      // see useUndoableAction.ts's toast action) — 2026-08-23 user request.
      cell: ({ row }) => h(UButton, {
        label: t('trash.restore'),
        icon: ICONS.undo,
        color: 'neutral',
        variant: 'outline',
        size: 'xs',
        onClick: (e: MouseEvent) => {
          e.stopPropagation()
          onRestore(row.original)
        }
      })
    }
  ]

  return { columns }
}
