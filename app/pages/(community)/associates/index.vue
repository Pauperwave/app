<!-- app\pages\(community)\associates\index.vue -->
<script setup lang="ts">
import type { TableColumn, TabsItem } from '@nuxt/ui'
import { upperFirst } from 'scule'
import { UBadge } from '#components'
import type { Table } from '@tanstack/vue-table'
import type { Associate, StatusColor } from '~/types'

const {
  data: associates, isLoading: loading, status, refetch
} = useAssociatesQuery()
const { data: geocodes, isLoading: geocodesLoading } = useAssociatesGeocodesQuery()
const { t } = useI18n()
const { formatDateTime, formatDate, renderConsentBadge } = useAssociatesRenderers()

// Roster = already-approved associates only. Pending/rejected requests moved
// to /associates/requests entirely (2026-08-11 UX split) — this table used
// to mix "people who are members" with "people asking to become one", which
// made it easy to miss new requests buried in a status filter. pendingCount
// is still computed from the full unfiltered list (not rosterAssociates) —
// it feeds the SubNav badge here and the same count backs the sidebar badge
// in default.vue, both reading the same 'associates' cache key.
const rosterAssociates = computed(() => (associates.value ?? []).filter(
  associate => associate.membership_request_status === 'approved'
))
const pendingCount = computed(() => (associates.value ?? []).filter(
  associate => associate.membership_request_status === 'pending'
).length)

const tour = useAssociatesTour()

const viewMode = ref<'table' | 'map'>('table')
const viewModeItems = computed<TabsItem[]>(() => [
  { label: t('associate.views.table'), value: 'table', icon: 'i-lucide-table' },
  { label: t('associate.views.map'), value: 'map', icon: 'i-lucide-map' }
])

const route = useRoute()
const router = useRouter()

const table = useTemplateRef<{ tableApi: Table<Associate> }>('table')
const {
  editingAssociate, editModalOpen,
  renewingAssociate, renewModalOpen,
  tableContextMenuItems, onRowContextmenu
} = useAssociatesRowActions()

// Row-selection existed here with nothing wired to it (2026-08-16) — bulk
// "Rinnova" is the fix, same shape as tournaments'/wanted-cards' bulk bars.
const selectedRosterAssociates = computed<Associate[]>(() =>
  table.value?.tableApi?.getFilteredSelectedRowModel().rows.map(row => row.original) ?? [])
const {
  pendingRenewal, confirmOpen: renewConfirmOpen, receivedBy, receiverOptions,
  requestBulkRenew, confirmBulkRenew
} = useAssociatesBulkActions()
// fallow-ignore-next-line code-duplication -- the useAssociatesTableColumns destructure
// and status-filter-from-query function mirror requests.vue's own (different column
// id and query semantics per page), not worth forcing into a shared helper
const {
  columnHeaders, visibilityItems,
  selectColumn, idColumn, updatedAtColumn, updatedByColumn,
  paymentDateColumn, pauperwaveAssociateNumberColumn, membershipRequestStatusColumn,
  associateTypeColumn, consentDataColumn, consentSocialColumn, hasReadStatuteColumn,
  firstNameColumn, lastNameColumn, emailAddressColumn, phoneNumberColumn, taxCodeColumn,
  bornDateColumn, bornLocationColumn, bornProvinceColumn, bornStateColumn,
  residencyAddressColumn, residencyHouseNumberColumn, residencyCityColumn,
  residencyProvinceColumn, residencyCapColumn, mtgoNicknameColumn, mtgaNicknameColumn
} = useAssociatesTableColumns(table, associates)

// Wires the sidebar links (/associates?status=pending|active|to_renew) to the
// membership_status column filter, which can only be applied after UTable mounts.
// fallow-ignore-next-line code-duplication -- see the destructure comment above
function applyMembershipStatusFilterFromQuery() {
  const statusColumn = table.value?.tableApi?.getColumn('membership_status')
  if (!statusColumn) return
  const status = route.query.status
  statusColumn.setFilterValue(typeof status === 'string' ? status : undefined)
}

onMounted(() => nextTick(applyMembershipStatusFilterFromQuery))
watch(() => route.query.status, applyMembershipStatusFilterFromQuery)

// Real counts per membership status, for the tabs above the table (they replace the
// old static sidebar links). No 'pending' here anymore — rosterAssociates never
// contains pending requests in the first place.
const associatesStatusCounts = computed(() => {
  const counts = { active: 0, to_renew: 0 }
  for (const associate of rosterAssociates.value) {
    if (associate.membership_status in counts) {
      counts[associate.membership_status as keyof typeof counts]++
    }
  }
  return counts
})

// Rendered via the generic StatusFilterGroup (also used by wanted-cards), not
// UTabs: toggle buttons filter the table below rather than switching between
// separate views. `count` is optional per item — StatusFilterGroup only shows
// the nested UBadge when it's set.
const statusTabs = computed(() => [
  { label: t('associate.tabs.all'), value: 'all' as const, count: undefined },
  { label: t('associate.tabs.active'), value: 'active' as const, count: associatesStatusCounts.value.active },
  { label: t('associate.tabs.toRenew'), value: 'to_renew' as const, count: associatesStatusCounts.value.to_renew }
])

const activeStatusTab = computed({
  get: () => (typeof route.query.status === 'string' ? route.query.status : 'all'),
  set: (value: string | number) => {
    router.replace({ query: { ...route.query, status: value === 'all' ? undefined : value } })
  }
})

const columnFilters = ref([])

const columnVisibility = ref({
  // Always "approved" here now that pending/rejected requests live on their
  // own page (/associates/requests) — redundant on every row in the roster.
  membership_request_status: false,
  uuid: false,
  created_at: false,
  association_date: false,
  associate_type: false,
  consent_data: false,
  has_read_statute: false,
  has_acknowledged_surveillance_notice: false,
  born_location: false,
  born_province: false,
  born_state: false,
  residency_address: false,
  residency_house_number: false,
  residency_city: false,
  residency_province: false,
  residency_cap: false,
  mtgo_nickname: false,
  mtga_nickname: false
})

const rowSelection = ref({})

const columns: TableColumn<Associate>[] = [
  selectColumn,
  idColumn,
  {
    accessorKey: 'uuid',
    header: columnHeaders.uuid,
    cell: ({ row }) => renderNeutralBadge(row.original.uuid)
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => sortableHeader(columnHeaders.created_at, column),
    meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
    cell: ({ row }) => formatDateTime(row.original.created_at)
  },
  updatedAtColumn,
  updatedByColumn,
  membershipRequestStatusColumn,
  {
    accessorKey: 'membership_status',
    header: ({ column }) => sortableHeader(columnHeaders.membership_status, column),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => {
      const status = row.getValue('membership_status') as string
      const { color, icon } = MEMBERSHIP_STATUS_BADGE_CONFIG[status] || { color: 'neutral', icon: ICONS.help }

      return h(UBadge, {
        class: 'capitalize gap-2',
        variant: 'subtle',
        icon,
        color,
        label: upperFirst(status.replace('_', ' '))
      })
    }
  },
  paymentDateColumn,
  {
    accessorKey: 'association_date',
    header: ({ column }) => sortableHeader(columnHeaders.association_date, column),
    meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
    cell: ({ row }) => formatDate(row.original.association_date)
  },
  associateTypeColumn,
  pauperwaveAssociateNumberColumn,
  consentDataColumn,
  consentSocialColumn,
  hasReadStatuteColumn,
  {
    accessorKey: 'has_acknowledged_surveillance_notice',
    header: ({ column }) =>
      sortableHeader(columnHeaders.has_acknowledged_surveillance_notice, column),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => renderConsentBadge(row.original.has_acknowledged_surveillance_notice)
  },
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
  mtgaNicknameColumn
]

function renderNeutralBadge(value: string) {
  return h(UBadge, {
    variant: 'subtle',
    color: 'neutral',
    class: 'font-mono',
    label: String(value)
  })
}

const consentSocialOptions: { label: string, value: string, icon: string, color: StatusColor }[] = [
  { label: t('associate.consentSocialOptions.all'), value: 'all', icon: 'i-lucide-megaphone', color: 'neutral' },
  { label: t('associate.consentSocialOptions.yes'), value: 'yes', icon: ICONS.success, color: 'success' },
  { label: t('associate.consentSocialOptions.no'), value: 'no', icon: ICONS.clear, color: 'error' }
]

const emailFilter = computed({
  get: () => (table.value?.tableApi?.getColumn('email_address')?.getFilterValue() as string) ?? '',
  set: (value: string) => table.value?.tableApi?.getColumn('email_address')?.setFilterValue(value)
})

const consentSocialFilter = ref('all')

watch(() => consentSocialFilter.value, (newVal) => {
  if (!table?.value?.tableApi) return

  const consentColumn = table.value.tableApi.getColumn('consent_social')
  if (!consentColumn) return

  consentColumn.setFilterValue(newVal === 'all' ? undefined : newVal === 'yes')
})
</script>

<template>
  <UDashboardPanel id="associates">
    <template #header>
      <ListPageNavbar
        :title="$t('associate.breadcrumb')"
        :tour-label="$t('associate.tour.startButton')"
        :loading="loading"
        :status="status"
        :ui="{ right: 'gap-2' }"
        @refresh="refetch"
        @tour-start="tour.start()"
      >
        <div id="tour-associates-view-mode">
          <ViewModeTabs v-model="viewMode" :items="viewModeItems" />
        </div>

        <USeparator orientation="vertical" class="h-4" />

        <NotificationsBellButton />
      </ListPageNavbar>

      <!-- Switcher shared with /associates/requests (see AssociatesSubNav) —
           same sub-nav-row pattern as /settings. -->
      <UDashboardToolbar>
        <div id="tour-associates-subnav" class="w-fit">
          <AssociatesSubNav :pending-count="pendingCount" />
        </div>
      </UDashboardToolbar>

      <!-- Status filter, search/social/columns filters and row-actions all in one
           toolbar row — same #left/#right split as wanted-cards' UDashboardToolbar.
           Status is a UFieldGroup of toggle UButtons, not UTabs: this filters the
           table below rather than switching between separate views. -->
      <UDashboardToolbar
        v-if="viewMode === 'table'"
        :ui="{ root: 'flex-wrap h-auto py-2 gap-1.5', left: 'gap-4 flex-wrap', right: 'gap-4' }"
      >
        <template #left>
          <AssociatesListBulkActionsBar
            v-if="selectedRosterAssociates.length"
            side="left"
            :count="selectedRosterAssociates.length"
            @clear="table?.tableApi?.resetRowSelection()"
          />
          <div v-else id="tour-associates-filters" class="flex items-center gap-4 flex-wrap">
            <AssociatesListFiltersBar
              v-model:active-status-tab="activeStatusTab"
              v-model:email-filter="emailFilter"
              v-model:consent-social-filter="consentSocialFilter"
              :status-tabs="statusTabs"
              :consent-social-options="consentSocialOptions"
            />
          </div>
        </template>

        <template #right>
          <AssociatesListBulkActionsBar
            v-if="selectedRosterAssociates.length"
            side="right"
            :count="selectedRosterAssociates.length"
            show-renew
            @renew="requestBulkRenew(selectedRosterAssociates)"
          />
          <div v-else id="tour-associates-actions">
            <AssociatesTableToolbarActions :visibility-items="visibilityItems" />
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <template v-if="viewMode === 'table'">
        <UContextMenu :items="tableContextMenuItems">
          <UTable
            id="tour-associates-table"
            ref="table"
            v-model:column-filters="columnFilters"
            v-model:column-visibility="columnVisibility"
            v-model:row-selection="rowSelection"
            :virtualize="{
              estimateSize: 35,
              overscan: 12
            }"
            :data="rosterAssociates"
            :columns="columns"
            class="flex-1 h-80 shrink-0"
            :loading="loading"
            sticky="header"
            @contextmenu="onRowContextmenu"
          />
        </UContextMenu>

        <TableSelectionFooter
          :selected="table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0"
          :total="table?.tableApi?.getFilteredRowModel().rows.length || 0"
        />
      </template>

      <AssociatesListMapView
        v-else
        :associates="rosterAssociates"
        :geocodes="geocodes ?? []"
        :loading="loading || geocodesLoading"
      />
    </template>
  </UDashboardPanel>

  <AssociatesListEditModal v-model="editModalOpen" :associate="editingAssociate" />
  <TransactionsListAddModal
    v-model="renewModalOpen"
    :preset-associate="renewingAssociate"
    hide-trigger
  />

  <ConfirmModal
    v-model:open="renewConfirmOpen"
    :title="$t('associate.bulkActions.renewModalTitle', pendingRenewal?.length ?? 0)"
    :confirm-label="$t('associate.rowActions.renew')"
    :confirm-icon="ICONS.refresh"
    confirm-color="primary"
    :confirm-disabled="!receivedBy"
    @confirm="confirmBulkRenew"
  >
    <UFormField :label="$t('associate.bulkActions.renewModalReceivedByLabel')" class="mb-3">
      <USelectMenu
        v-model="receivedBy"
        :items="receiverOptions"
        value-key="value"
        :avatar="receiverOptions.find(option => option.value === receivedBy)?.avatar"
        :placeholder="$t('associate.bulkActions.renewModalReceivedByPlaceholder')"
        class="w-full"
      />
    </UFormField>

    <ul v-if="pendingRenewal" class="max-h-40 overflow-y-auto text-sm space-y-1">
      <li v-for="associate in pendingRenewal" :key="associate.id">
        {{ associate.first_name }} {{ associate.last_name }}
      </li>
    </ul>
  </ConfirmModal>

  <TourGuide :tour="tour" />
</template>
