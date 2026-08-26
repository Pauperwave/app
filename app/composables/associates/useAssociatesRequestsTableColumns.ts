// app\composables\associates\useAssociatesRequestsTableColumns.ts
// Extracted out of requests.vue (2026-08-16) — the column selection/order
// was defined inline there while every other domain (locations, tournaments,
// the roster's own useAssociatesTableColumns.ts) extracts this into its own
// composable. Just an ordering of columns already built by
// useAssociatesTableColumns.ts, not a second set of column definitions.
// fallow-ignore-file code-duplication -- the destructure below necessarily
// repeats useAssociatesTableColumns.ts's own return-statement property
// names (it pulls out every column to reorder them below) — that's the
// whole point of this file, not redundant code to remove.
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { Table } from '@tanstack/vue-table'
import type { Associate } from '~/types'
import type { Selection } from '~/composables/useSelection'

// "Mostra colonne" section dividers — ID, Stato/Richiesta/Tesseramento,
// Consensi, Anagrafica, Nascita, Residenza, Trail (see
// columnVisibilityGroups.ts, user request 2026-08-27). No uuid column here
// (associates/index.vue-only), so "ID" ends up a one-item group — kept
// anyway for the same boundary as that page.
const REQUESTS_VISIBILITY_SEPARATOR_BEFORE_IDS = [
  'membership_request_status', 'consent_data', 'first_name',
  'born_date', 'residency_address', 'updated_by'
]

export function useAssociatesRequestsTableColumns(
  selection: Selection<number>,
  table: Ref<{ tableApi: Table<Associate> } | null>,
  associates: Ref<Associate[] | undefined>,
  rowContextMenuItems: (associate: Associate) => DropdownMenuItem[],
  search?: Ref<string>
) {
  const {
    visibilityItems,
    selectColumn, idColumn, updatedAtColumn, updatedByColumn, actionsColumn,
    lastRenewalDateColumn, pauperwaveAssociateNumberColumn,
    membershipRequestStatusColumn, requestDateColumn,
    associateTypeColumn, consentDataColumn, consentSocialColumn, hasReadStatuteColumn,
    firstNameColumn, lastNameColumn, emailAddressColumn, phoneNumberColumn, taxCodeColumn,
    bornDateColumn, ageColumn, bornLocationColumn, bornProvinceColumn, bornStateColumn,
    residencyAddressColumn, residencyHouseNumberColumn, residencyCityColumn,
    residencyProvinceColumn, residencyCapColumn
  } = useAssociatesTableColumns(
    selection, table, associates, rowContextMenuItems, search,
    REQUESTS_VISIBILITY_SEPARATOR_BEFORE_IDS
  )

  const columns: TableColumn<Associate>[] = [
    selectColumn,
    idColumn,
    membershipRequestStatusColumn,
    requestDateColumn,
    lastRenewalDateColumn,
    pauperwaveAssociateNumberColumn,
    // Consensi before personal data (user request, 2026-08-19) — matches the
    // roster's own order (associates/index.vue), which already had this
    // block ahead of firstNameColumn; requests.vue had it after, the
    // inconsistency being fixed here.
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
    ageColumn,
    bornLocationColumn,
    bornProvinceColumn,
    bornStateColumn,
    residencyAddressColumn,
    residencyHouseNumberColumn,
    residencyCityColumn,
    residencyProvinceColumn,
    residencyCapColumn,
    updatedByColumn,
    updatedAtColumn,
    actionsColumn
  ]

  return { columns, visibilityItems }
}
