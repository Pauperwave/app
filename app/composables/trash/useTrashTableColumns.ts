// app\composables\trash\useTrashTableColumns.ts
import { h } from 'vue'
import { UBadge, UButton } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { TrashItem } from '~/types'
import DateWithRelativeTooltip from '~/components/ui/DateWithRelativeTooltip.vue'
import AssociateTag from '~/components/ui/AssociateTag.vue'

// No selection/bulk-restore column, unlike useEventsTableColumns.ts: a Trash page is a low-traffic
// admin tool, one row at a time is enough (YAGNI).
//
// canPurge (the super_admin-only 'purge-trash' permission) gates the "Elimina permanentemente"
// button: an admin below super_admin can view and restore but not purge, so it would otherwise show
// a button that 403s
export function useTrashTableColumns(
  onRestore: (item: TrashItem) => void,
  onPurge: (item: TrashItem) => void,
  canPurge: () => boolean,
  retentionDays: () => number
) {
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
      cell: ({ row }) => row.original.deletedBy
        ? h(AssociateTag, {
          name: row.original.deletedBy,
          associateUuid: row.original.deletedByUuid
        })
        : '—'
    },
    {
      // A derived countdown (not a TrashItem field), sortable on the computed number so "closest to
      // being purged" sorts correctly
      id: 'daysRemaining',
      accessorFn: row => trashRetentionInfo(row.deletedAt, retentionDays()).daysRemaining,
      header: ({ column }) => sortableHeader(t('trash.columns.daysRemaining'), column),
      cell: ({ row }) => {
        const { daysRemaining, color } = trashRetentionInfo(row.original.deletedAt, retentionDays())
        return h(UBadge, {
          color,
          variant: 'subtle',
          icon: ICONS.timer
        }, () => daysRemaining > 0
          ? t('trash.daysRemaining', daysRemaining)
          : t('trash.expired'))
      }
    },
    {
      id: 'actions',
      header: t('trash.columns.actions'),
      // Labeled + outline, like every other "undo"-flavored action (ICONS.undo + variant:
      // 'outline', see useUndoableAction.ts's toast action)
      cell: ({ row }) => h('div', { class: 'flex gap-2 justify-start' }, [
        h(UButton, {
          label: t('trash.restore'),
          icon: ICONS.undo,
          color: 'neutral',
          variant: 'outline',
          size: 'xs',
          onClick: (e: MouseEvent) => {
            e.stopPropagation()
            onRestore(row.original)
          }
        }),
        canPurge()
          ? h(UButton, {
            label: t('trash.purge'),
            icon: ICONS.delete,
            color: 'error',
            variant: 'outline',
            size: 'xs',
            onClick: (e: MouseEvent) => {
              e.stopPropagation()
              onPurge(row.original)
            }
          })
          : null
      ])
    }
  ]

  return { columns }
}
