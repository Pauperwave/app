// app\composables\associates\useAssociatesRequestsTableColumns.ts
// Column selection/order for requests.vue, extracted like every other domain: just an ordering of
// the columns built by useAssociatesTableColumns.ts, not a second set of definitions.
// fallow-ignore-file code-duplication -- the destructure below repeats
// useAssociatesTableColumns.ts's return property names (it pulls out every column to reorder them),
// by design
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { Table } from '@tanstack/vue-table'
import type { Associate } from '~/types'
import type { Selection } from '~/composables/useSelection'

// "Mostra colonne" section dividers: ID, Stato/Richiesta/Tesseramento, Consensi, Anagrafica,
// Nascita, Residenza, Trail (see columnVisibilityGroups.ts). No uuid column here (index.vue-only),
// so "ID" is a one-item group, kept for the same boundary as that page
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
    // associateType before pauperwaveAssociateNumber, matching the roster's order
    // (associates/index.vue)
    associateTypeColumn,
    pauperwaveAssociateNumberColumn,
    // Consensi before personal data, matching the roster's order (associates/index.vue)
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
