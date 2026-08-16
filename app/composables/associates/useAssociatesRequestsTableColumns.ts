// app\composables\associates\useAssociatesRequestsTableColumns.ts
// Extracted out of requests.vue (2026-08-16) — the column selection/order
// was defined inline there while every other domain (locations, tournaments,
// the roster's own useAssociatesTableColumns.ts) extracts this into its own
// composable. Just an ordering of columns already built by
// useAssociatesTableColumns.ts, not a second set of column definitions.
import type { TableColumn } from '@nuxt/ui'
import type { Table } from '@tanstack/vue-table'
import type { Associate } from '~/types'

export function useAssociatesRequestsTableColumns(
  table: Ref<{ tableApi: Table<Associate> } | null>
) {
  const {
    visibilityItems,
    selectColumn, idColumn, updatedAtColumn, updatedByColumn,
    paymentDateColumn, pauperwaveAssociateNumberColumn,
    membershipRequestStatusColumn, requestDateColumn,
    associateTypeColumn, consentDataColumn, consentSocialColumn, hasReadStatuteColumn,
    firstNameColumn, lastNameColumn, emailAddressColumn, phoneNumberColumn, taxCodeColumn,
    bornDateColumn, bornLocationColumn, bornProvinceColumn, bornStateColumn,
    residencyAddressColumn, residencyHouseNumberColumn, residencyCityColumn,
    residencyProvinceColumn, residencyCapColumn, mtgoNicknameColumn, mtgaNicknameColumn
  } = useAssociatesTableColumns(table)

  const columns: TableColumn<Associate>[] = [
    selectColumn,
    idColumn,
    membershipRequestStatusColumn,
    requestDateColumn,
    updatedAtColumn,
    updatedByColumn,
    paymentDateColumn,
    pauperwaveAssociateNumberColumn,
    firstNameColumn,
    lastNameColumn,
    emailAddressColumn,
    phoneNumberColumn,
    taxCodeColumn,
    associateTypeColumn,
    consentDataColumn,
    consentSocialColumn,
    hasReadStatuteColumn,
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
    mtgaNicknameColumn
  ]

  return { columns, visibilityItems }
}
