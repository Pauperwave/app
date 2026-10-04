// app\composables\settings\usePermissionsTable.ts
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { UBadge, UIcon, UTooltip } from '#components'
import type { AppRole } from '~/types'
import { featureSegments } from '~/utils/settings/featureSegments'
import { buildPermissionRows } from '~/utils/settings/permissionRows'
import type {
  ImplementationStatus,
  PermissionRow,
  RoleCell,
  RoleKey
} from '~/utils/settings/permissionRows'

// The semantic colors of status elsewhere (UBadge success/warning/error): full/partial map onto
// them. 'none' has no entry: those cells render blank (see roleColumn below), not an X, since a
// grid mostly full of "no access" icons was noise
export const ACCESS_META: Record<'full' | 'partial', { icon: string, color: string }> = {
  full: { icon: ICONS.successFilled, color: 'text-success' },
  partial: { icon: ICONS.circleDot, color: 'text-warning' }
}

// Badge, not a bare icon like ACCESS_META — this column reads left-to-right as
// its own sentence ("Implementato" / "Parziale" / "Non implementato"), unlike
// the role grid where the column header already supplies the missing word.
const STATUS_META: Record<ImplementationStatus, { color: 'success' | 'warning' | 'error' }> = {
  implemented: { color: 'success' },
  partial: { color: 'warning' },
  notImplemented: { color: 'error' }
}

// RoleKey is camelCase ('superAdmin'), ROLE_ICON (app/utils/roles.ts) is
// keyed by the live AppRole union ('super_admin') — this is the one place
// the two need bridging, everywhere else already uses one or the other.
const ROLE_KEY_TO_APP_ROLE = {
  player: 'player', organizer: 'organizer', admin: 'admin', superAdmin: 'super_admin'
} as const satisfies Record<RoleKey, AppRole>

function renderFeature(text: string) {
  return featureSegments(text).map((segment) => {
    if (segment.kind === 'strong') return h('strong', segment.value)
    if (segment.kind === 'code') return h('code', { class: 'font-mono' }, segment.value)
    return segment.value
  })
}

// Shared by publicColumn/roleColumn below — both render the same
// full/partial icon (or nothing, for 'none'/blank) from a RoleCell.
function accessCell(roleCell: RoleCell | undefined) {
  if (!roleCell) return null
  const { access, note } = roleCell
  if (access === 'none') return null

  const icon = h(UIcon, { name: ACCESS_META[access].icon, class: ['size-5', ACCESS_META[access].color] })
  return note ? h(UTooltip, { text: note }, () => icon) : icon
}

// The rows of the "Ruoli e permessi" table, the columns that render them and the legend of its
// access icons
export function usePermissionsTable() {
  const { t, te } = useI18n()

  const rows = computed(() => buildPermissionRows(t, te))

  // Legend only covers the two states that actually render something — 'none' is
  // the unlabelled blank space, self-explanatory once the other two are defined.
  const legend = computed(() => (['full', 'partial'] as const).map(access => ({
    access,
    label: t(`settings.permissions.access.${access}`)
  })))

  function roleColumn(role: RoleKey): TableColumn<PermissionRow> {
    return {
      accessorKey: role,
      header: () => h('span', { class: 'flex items-center justify-center gap-1.5 text-sm' }, [
        h(UIcon, { name: ROLE_ICON[ROLE_KEY_TO_APP_ROLE[role]], class: 'size-4' }),
        t(`settings.permissions.columns.${role}`)
      ]),
      meta: { class: { th: 'text-center', td: 'text-center' } },
      cell: ({ row }) => accessCell(row.original[role])
    }
  }

  // Unauthenticated access: the same RoleCell shape and icon set as the four role columns, keyed
  // off `publicAccess` instead of a RoleKey, with no ROLE_ICON lookup (not a real AppRole)
  function publicColumn(): TableColumn<PermissionRow> {
    return {
      accessorKey: 'publicAccess',
      header: () => h('span', { class: 'flex items-center justify-center gap-1.5 text-sm' }, [
        h(UIcon, { name: ICONS.globe, class: 'size-4' }),
        t('settings.permissions.columns.public')
      ]),
      meta: { class: { th: 'text-center', td: 'text-center' } },
      cell: ({ row }) => accessCell(row.original.publicAccess)
    }
  }

  const columns: TableColumn<PermissionRow>[] = [
    {
      accessorKey: 'feature',
      header: () => t('settings.permissions.columns.feature'),
      // w-px + whitespace-nowrap: the shrink-to-fit trick, so the column is exactly as wide as its
      // longest row: without it, w-full on the table stretches it to fill leftover space with blank
      // padding instead of the icon columns. Deliberately no whitespace-normal wrapping, unlike
      // domains.vue: every row stays on one line
      meta: { class: { th: 'whitespace-nowrap w-px', td: 'whitespace-nowrap w-px' } },
      cell: ({ row }) => row.original.isSection
        ? h('span', { class: 'font-semibold text-highlighted block mt-3' }, row.original.feature)
        : renderFeature(row.original.feature)
    },
    {
      accessorKey: 'status',
      header: () => h('span', { class: 'text-sm' }, t('settings.permissions.columns.status')),
      meta: {
        class: { th: 'whitespace-nowrap w-px text-center', td: 'whitespace-nowrap w-px text-center' }
      },
      cell: ({ row }) => {
        const { status, statusNote } = row.original
        if (!status) return null
        const badge = h(UBadge, {
          color: STATUS_META[status].color,
          variant: 'subtle'
        }, () => t(`settings.permissions.status.${status}`))
        return statusNote ? h(UTooltip, { text: statusNote }, () => badge) : badge
      }
    },
    publicColumn(),
    roleColumn('player'),
    roleColumn('organizer'),
    roleColumn('admin'),
    roleColumn('superAdmin')
  ]

  return { rows, columns, legend }
}
