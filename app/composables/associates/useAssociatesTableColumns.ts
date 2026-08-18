// app\composables\associates\useAssociatesTableColumns.ts
import { upperFirst } from 'scule'
import { UBadge, UCheckbox } from '#components'
import type { BadgeProps, DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { Column, Table } from '@tanstack/vue-table'
import type { Associate } from '~/types'
import AssociateTag from '~/components/ui/AssociateTag.vue'
import DateWithRelativeTooltip from '~/components/ui/DateWithRelativeTooltip.vue'
import RowActionsMenu from '~/components/ui/RowActionsMenu.vue'

// Shared between associates/index.vue (roster) and associates/requests.vue
// (pending/rejected queue) — every column except the roster-only ones
// (uuid/created_at/membership_status/association_date/
// has_acknowledged_surveillance_notice) was byte-identical in both files
// (fallow dupes, 2026-08-11), same root cause as useAssociatesRenderers.ts:
// the two pages share one Associate table shape, not two. id/updated_at/
// updated_by/latest_renewal_date/pauperwave_associate_number moved from roster-only
// to shared 2026-08-13 (user request — requests.vue was showing fewer
// columns than the roster for no real reason on these five).
//
// Two real inconsistencies surfaced while merging: born_location and
// residency_city were sortable on the roster but plain text on requests —
// unified to plain text here (sorting free text like a city/birthplace name
// alphabetically isn't a useful operation), matching requests' version.

export const associatesColumnHeaders = (t: (key: string) => string) => ({
  id: t('associate.columns.id'),
  uuid: t('associate.columns.uuid'),
  created_at: t('associate.columns.createdAt'),
  updated_by: t('associate.columns.updatedBy'),
  updated_at: t('associate.columns.updatedAt'),
  membership_request_status: t('associate.columns.membershipRequestStatus'),
  membership_status: t('associate.columns.membershipStatus'),
  request_date: t('associate.columns.requestDate'),
  latest_renewal_date: t('associate.columns.lastRenewalDate'),
  association_date: t('associate.columns.associationDate'),
  associate_type: t('associate.columns.associateType'),
  pauperwave_associate_number: t('associate.columns.pauperwaveAssociateNumber'),
  consent_data: t('associate.columns.consentData'),
  consent_social: t('associate.columns.consentSocial'),
  has_read_statute: t('associate.columns.hasReadStatute'),
  has_acknowledged_surveillance_notice: t('associate.columns.hasAcknowledgedSurveillanceNotice'),
  first_name: t('associate.columns.firstName'),
  last_name: t('associate.columns.lastName'),
  email_address: t('associate.columns.emailAddress'),
  phone_number: t('associate.columns.phoneNumber'),
  tax_code: t('associate.columns.taxCode'),
  born_date: t('associate.columns.bornDate'),
  born_location: t('associate.columns.bornLocation'),
  born_province: t('associate.columns.bornProvince'),
  born_state: t('associate.columns.bornState'),
  residency_address: t('associate.columns.residencyAddress'),
  residency_house_number: t('associate.columns.residencyHouseNumber'),
  residency_city: t('associate.columns.residencyCity'),
  residency_province: t('associate.columns.residencyProvince'),
  residency_cap: t('associate.columns.residencyCap'),
  mtgo_nickname: t('associate.columns.mtgoNickname'),
  mtga_nickname: t('associate.columns.mtgaNickname'),
  actions: t('associate.columns.actions')
} as const)

export type AssociatesColumnHeaders = ReturnType<typeof associatesColumnHeaders>
type AssociatesColumnHeaderKey = keyof AssociatesColumnHeaders

export function useAssociatesTableColumns(
  table: Ref<{ tableApi: Table<Associate> } | null>,
  associates: Ref<Associate[] | undefined>,
  rowContextMenuItems: (associate: Associate) => DropdownMenuItem[]
) {
  const { t } = useI18n()
  const { renderAssociateTypeBadge, renderConsentBadge } = useAssociatesRenderers()

  const columnHeaders = associatesColumnHeaders(t)

  // updated_by/created_by are associate uuids (audit trail pattern,
  // docs/supabase/2-database.md) — PostgREST can't embed a self-referencing
  // FK (confirmed: pauperwave_associates!updated_by fails with "no
  // relationship found" even with the constraint-name hint), so resolved
  // client-side instead, against the full associates list already fetched
  // on both pages that use these columns — no extra query needed.
  const associateNameByUuid = computed(() => new Map(
    (associates.value ?? []).map(associate => [associate.uuid, `${associate.first_name} ${associate.last_name}`])
  ))

  function getColumnLabel(id: string): string {
    return id in columnHeaders ? columnHeaders[id as AssociatesColumnHeaderKey] : id
  }

  function createVisibilityItem(column: Column<Associate>): DropdownMenuItem {
    return {
      label: getColumnLabel(column.id),
      type: 'checkbox' as const,
      checked: column.getIsVisible(),
      onUpdateChecked(checked: boolean) {
        table.value?.tableApi?.getColumn(column.id)?.toggleVisibility(!!checked)
      },
      onSelect(e: Event) {
        e.preventDefault()
      }
    }
  }

  function getVisibilityItems(): DropdownMenuItem[] {
    const allColumns = table.value?.tableApi?.getAllColumns()
    if (!allColumns) return []

    return allColumns
      .filter((column: Column<Associate>) => column.getCanHide())
      .map(createVisibilityItem)
  }

  const visibilityItems = computed(() => getVisibilityItems())

  const selectColumn: TableColumn<Associate> = {
    id: 'select',
    enableSorting: false,
    enableHiding: false,
    meta: { class: { th: 'w-px p-0', td: 'w-px p-0' } },
    header: ({ table: t2 }) =>
      centerTableCell(h(UCheckbox, {
        'modelValue': t2.getIsSomePageRowsSelected()
          ? 'indeterminate'
          : t2.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: unknown) =>
          t2.toggleAllPageRowsSelected(!!value),
        'aria-label': t('common.selectAll')
      })),
    cell: ({ row }) =>
      centerTableCell(h(UCheckbox, {
        'modelValue': row.getIsSelected(),
        'onUpdate:modelValue': (value: unknown) => row.toggleSelected(!!value),
        'aria-label': t('common.selectRow')
      }))
  }

  // Shared with associates/index.vue since 2026-08-13 (was inline there only) —
  // requests.vue shows these too now: id/updated_at/updated_by for traceability
  // on a request under review, latest_renewal_date/pauperwave_associate_number to
  // preview what a pending request would get once approved (the number is
  // potential/unassigned until then, same shared "Tessera" label as the roster).
  const idColumn: TableColumn<Associate> = {
    accessorKey: 'id',
    header: ({ column }) => sortableHeader(columnHeaders.id, column),
    meta: { class: { th: 'text-right', td: 'text-right font-mono' } },
    cell: ({ row }) => row.original.id
  }

  // Formalized 2026-08-18 out of an inline literal in index.vue — same
  // grouping as updatedAtColumn/updatedByColumn below (audit trail, hidden
  // by default, moved to the end of both pages' column order).
  const createdAtColumn: TableColumn<Associate> = {
    accessorKey: 'created_at',
    header: ({ column }) => sortableHeader(columnHeaders.created_at, column),
    meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
    cell: ({ row }) => h(DateWithRelativeTooltip, { isoString: row.original.created_at })
  }

  const updatedAtColumn: TableColumn<Associate> = {
    accessorKey: 'updated_at',
    header: ({ column }) => sortableHeader(columnHeaders.updated_at, column),
    meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
    cell: ({ row }) => h(DateWithRelativeTooltip, { isoString: row.original.updated_at })
  }

  const updatedByColumn: TableColumn<Associate> = {
    accessorKey: 'updated_by',
    header: columnHeaders.updated_by,
    cell: ({ row }) => {
      if (!row.original.updated_by) return ''
      const name = associateNameByUuid.value.get(row.original.updated_by)
      return name ? h(AssociateTag, { name }) : row.original.updated_by
    }
  }

  // Latest renewal date (2026-08-18), not pauperwave_associates.payment_date — that
  // column is a one-time snapshot from initial signup, never updated on renewal, so
  // it silently went stale for anyone who has since renewed. This reads the view's
  // aggregated pauperwave_associate_renewals date instead (migration
  // 20260818120000_add_latest_renewal_date_to_associates_view.sql), same source as
  // AssociateTag.vue's "Ultimo rinnovo" popover (which shows just the year).
  const lastRenewalDateColumn: TableColumn<Associate> = {
    accessorKey: 'latest_renewal_date',
    header: ({ column }) => sortableHeader(columnHeaders.latest_renewal_date, column),
    meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
    cell: ({ row }) =>
      h(DateWithRelativeTooltip, { isoString: row.original.latest_renewal_date, time: false })
  }

  const pauperwaveAssociateNumberColumn: TableColumn<Associate> = {
    accessorKey: 'pauperwave_associate_number',
    header: ({ column }) => sortableHeader(columnHeaders.pauperwave_associate_number, column),
    meta: { class: { th: 'text-right', td: 'text-right font-mono' } },
    cell: ({ row }) => row.original.pauperwave_associate_number || ''
  }

  const membershipRequestStatusColumn: TableColumn<Associate> = {
    accessorKey: 'membership_request_status',
    header: ({ column }) => sortableHeader(columnHeaders.membership_request_status, column),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => {
      const status = row.getValue('membership_request_status') as string
      const statusConfig: Record<string, { color: BadgeProps['color'], icon: string }> = {
        approved: { color: 'success', icon: ICONS.success },
        pending: { color: 'warning', icon: ICONS.pending },
        rejected: { color: 'error', icon: ICONS.statusRejected }
      }
      const { color, icon } = statusConfig[status] || { color: 'neutral', icon: ICONS.help }

      return h(UBadge, {
        class: 'capitalize cursor-pointer hover:opacity-80 transition-opacity gap-2',
        variant: 'subtle',
        icon,
        color,
        label: upperFirst(status),
        onClick: (e: Event) => {
          e.stopPropagation() // Prevent row click if you add onSelect later
          table.value?.tableApi?.getColumn('membership_request_status')?.setFilterValue(status)
        }
      })
    }
  }

  const requestDateColumn: TableColumn<Associate> = {
    accessorKey: 'request_date',
    header: ({ column }) => sortableHeader(columnHeaders.request_date, column),
    meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
    cell: ({ row }) => h(DateWithRelativeTooltip, { isoString: row.original.request_date })
  }

  const associateTypeColumn: TableColumn<Associate> = {
    accessorKey: 'associate_type',
    header: ({ column }) => sortableHeader(columnHeaders.associate_type, column),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => renderAssociateTypeBadge(row.original.associate_type)
  }

  const consentDataColumn: TableColumn<Associate> = {
    accessorKey: 'consent_data',
    header: ({ column }) => sortableHeader(columnHeaders.consent_data, column),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => renderConsentBadge(row.original.consent_data)
  }

  const consentSocialColumn: TableColumn<Associate> = {
    accessorKey: 'consent_social',
    header: ({ column }) => sortableHeader(columnHeaders.consent_social, column),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => renderConsentBadge(row.original.consent_social)
  }

  const hasReadStatuteColumn: TableColumn<Associate> = {
    accessorKey: 'has_read_statute',
    header: ({ column }) => sortableHeader(columnHeaders.has_read_statute, column),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => renderConsentBadge(row.original.has_read_statute)
  }

  const firstNameColumn: TableColumn<Associate> = {
    accessorKey: 'first_name',
    header: ({ column }) => sortableHeader(columnHeaders.first_name, column),
    cell: ({ row }) => row.original.first_name
  }

  const lastNameColumn: TableColumn<Associate> = {
    accessorKey: 'last_name',
    header: ({ column }) => sortableHeader(columnHeaders.last_name, column),
    cell: ({ row }) => row.original.last_name
  }

  const emailAddressColumn: TableColumn<Associate> = {
    accessorKey: 'email_address',
    header: columnHeaders.email_address,
    cell: ({ row }) => row.original.email_address
  }

  const phoneNumberColumn: TableColumn<Associate> = {
    accessorKey: 'phone_number',
    header: columnHeaders.phone_number,
    meta: { class: { td: 'font-mono' } },
    cell: ({ row }) => row.original.phone_number
  }

  const taxCodeColumn: TableColumn<Associate> = {
    accessorKey: 'tax_code',
    header: columnHeaders.tax_code,
    meta: { class: { td: 'font-mono' } },
    cell: ({ row }) => row.original.tax_code
  }

  const bornDateColumn: TableColumn<Associate> = {
    accessorKey: 'born_date',
    header: ({ column }) => sortableHeader(columnHeaders.born_date, column),
    meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
    cell: ({ row }) =>
      h(DateWithRelativeTooltip, { isoString: row.original.born_date, time: false })
  }

  const bornLocationColumn: TableColumn<Associate> = {
    accessorKey: 'born_location',
    header: columnHeaders.born_location,
    cell: ({ row }) => row.original.born_location || ''
  }

  const bornProvinceColumn: TableColumn<Associate> = {
    accessorKey: 'born_province',
    header: columnHeaders.born_province,
    meta: { class: { th: 'min-w-28', td: 'font-mono' } },
    cell: ({ row }) => row.original.born_province || ''
  }

  const bornStateColumn: TableColumn<Associate> = {
    accessorKey: 'born_state',
    header: columnHeaders.born_state,
    meta: { class: { th: 'min-w-28' } },
    cell: ({ row }) => row.original.born_state || ''
  }

  const residencyAddressColumn: TableColumn<Associate> = {
    accessorKey: 'residency_address',
    header: columnHeaders.residency_address,
    cell: ({ row }) => row.original.residency_address
  }

  const residencyHouseNumberColumn: TableColumn<Associate> = {
    accessorKey: 'residency_house_number',
    header: columnHeaders.residency_house_number,
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }) => row.original.residency_house_number || ''
  }

  const residencyCityColumn: TableColumn<Associate> = {
    accessorKey: 'residency_city',
    header: columnHeaders.residency_city,
    cell: ({ row }) => row.original.residency_city
  }

  const residencyProvinceColumn: TableColumn<Associate> = {
    accessorKey: 'residency_province',
    header: columnHeaders.residency_province,
    meta: { class: { td: 'font-mono' } },
    cell: ({ row }) => row.original.residency_province
  }

  const residencyCapColumn: TableColumn<Associate> = {
    accessorKey: 'residency_cap',
    header: columnHeaders.residency_cap,
    meta: { class: { th: 'text-right', td: 'text-right font-mono' } },
    cell: ({ row }) => row.original.residency_cap
  }

  const mtgoNicknameColumn: TableColumn<Associate> = {
    accessorKey: 'mtgo_nickname',
    header: columnHeaders.mtgo_nickname,
    cell: ({ row }) => row.original.mtgo_nickname
  }

  const mtgaNicknameColumn: TableColumn<Associate> = {
    accessorKey: 'mtga_nickname',
    header: columnHeaders.mtga_nickname,
    cell: ({ row }) => row.original.mtga_nickname
  }

  // Visible actions column (2026-08-18), matching leagues/locations/tournaments'
  // convention — same items the right-click context menu already shows
  // (rowContextMenuItems), just also reachable without knowing to right-click.
  const actionsColumn: TableColumn<Associate> = {
    id: 'actions',
    header: columnHeaders.actions,
    cell: ({ row }) => h(RowActionsMenu, { items: rowContextMenuItems(row.original) })
  }

  return {
    columnHeaders,
    getColumnLabel,
    visibilityItems,
    selectColumn,
    idColumn,
    createdAtColumn,
    updatedAtColumn,
    updatedByColumn,
    lastRenewalDateColumn,
    pauperwaveAssociateNumberColumn,
    membershipRequestStatusColumn,
    requestDateColumn,
    associateTypeColumn,
    consentDataColumn,
    consentSocialColumn,
    hasReadStatuteColumn,
    firstNameColumn,
    lastNameColumn,
    emailAddressColumn,
    phoneNumberColumn,
    taxCodeColumn,
    bornDateColumn,
    bornLocationColumn,
    bornProvinceColumn,
    bornStateColumn,
    residencyAddressColumn,
    residencyHouseNumberColumn,
    residencyCityColumn,
    residencyProvinceColumn,
    residencyCapColumn,
    mtgoNicknameColumn,
    mtgaNicknameColumn,
    actionsColumn
  }
}
