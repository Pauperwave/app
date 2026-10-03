<!-- app\pages\(community)\associates\index.vue -->
<script setup lang="ts">
import { subYears } from 'date-fns'
import type { TableColumn, TabsItem } from '@nuxt/ui'
import { UBadge } from '#components'
import type { Associate, Range } from '~/types'
import ConsentBadge from '~/components/ui/ConsentBadge.vue'
import DateWithRelativeTooltip from '~/components/ui/DateWithRelativeTooltip.vue'
import MembershipStatusBadge from '~/components/ui/MembershipStatusBadge.vue'

// The route is gated like the sidebar link (view-associates): it used to be nav-hidden only, with
// the route open to any authenticated user (see the permissions.vue table's statusNote)
definePageMeta({ permission: 'view-associates' })

// Lifecycle order, not alphabetical (TanStack's default): matches the status tabs (Tutti/Attivi/Da
// rinnovare/Scaduti) and MEMBERSHIP_STATUS_BADGE_CONFIG's key order, so "Tesseramento" sorts as an
// admin thinks about the roster
const MEMBERSHIP_STATUS_SORT_ORDER: Record<string, number> = {
  active: 0,
  to_renew: 1,
  expired: 2,
  unpaid: 3
}

const {
  data: associates, isLoading: loading, isPending, status, refetch
} = useAssociatesQuery()
const { data: geocodes, isLoading: geocodesLoading } = useAssociatesGeocodesQuery()
// "Richieste (di rinnovo)" tab: a Set, not part of the Associate type, since it derives from a
// separate table (pauperwave_associate_membership_events), not a column on pauperwave_associates
const { data: pendingRenewalUuids } = usePendingRenewalRequestsQuery()
const { t } = useI18n()

useSeoMeta({ title: () => t('associate.breadcrumb') })

// Roster = already-approved associates only: pending/rejected requests live in /associates/requests
// (this table used to mix members with people asking to become one, burying new requests in a
// status filter). pendingCount is still computed from the full unfiltered list (not
// rosterAssociates): it feeds the SubNav badge here and the sidebar badge in default.vue, both
// reading the same 'associates' cache key
const rosterAssociates = computed(() => (associates.value ?? []).filter(
  associate => associate.membership_request_status === 'approved'
))
const pendingCount = computed(() => (associates.value ?? []).filter(
  associate => associate.membership_request_status === 'pending'
).length)

// Filters by latest_renewal_date (YearRangePicker.vue), defaulting to the last year ("who renewed
// recently"). An associate who never renewed (null latest_renewal_date) always stays visible:
// excluding them for having no date would hide exactly the people a "never renewed" review looks
// for
const range = shallowRef<Range>({
  start: subYears(new Date(), 1),
  end: new Date()
})
const availableRenewalYears = computed(() => availableAssociateRenewalYears(rosterAssociates.value))
const filteredRosterAssociates = computed(() => rosterAssociates.value.filter((associate) => {
  if (!associate.latest_renewal_date) return true
  const date = new Date(associate.latest_renewal_date)
  return date >= range.value.start && date <= range.value.end
}))

// undefined (ListSkeleton's default count) only on a genuine first load: isPending, unlike
// isLoading, is false once stale data exists to show a real count from, even mid-refetch (e.g. the
// manual refresh), like tournaments/locations' list pages
const skeletonCount = computed(() =>
  (isPending.value ? undefined : filteredRosterAssociates.value.length))

const tour = useAssociatesTour()

const viewMode = ref<'table' | 'map'>('table')
const viewModeItems = computed<TabsItem[]>(() => [
  { label: t('associate.views.table'), value: 'table', icon: ICONS.table },
  { label: t('associate.views.map'), value: 'map', icon: ICONS.map }
])

const {
  route, router, table,
  editingAssociate, editModalOpen,
  editingNumberAssociate, numberModalOpen,
  renewingAssociate, renewModalOpen,
  tableContextMenuItems, onRowContextmenu, rowContextMenuItems
} = useAssociatesTableSetup()

// On the shared Set-based useSelection.ts instead of UTable's row-selection state, like
// transactions'/wanted-cards'/tournaments'/leagues' tables (Escape-to-clear and shift-click range
// selection). Selected associates resolve against the table's own filtered row model (not
// rosterAssociates), so a selection hidden by the active status/email/consent filter isn't
// actionable (like wanted-cards' selectedCards)
const selection = useSelection<number>()
const selectedRosterAssociates = useSelectedTableRows(table, selection)
const {
  pendingRenewal, confirmOpen: renewConfirmOpen, receivedBy, receiverOptions, feeReady,
  requestBulkRenew, confirmBulkRenew
} = useAssociatesBulkActions(selection)

// "Approva rinnovo" on the "Richieste (di rinnovo)" tab acknowledges the request, not the payment
// (that stays the "Rinnova" flow above), so it has no undo-window/confirm modal: as direct as
// requests.vue's bulkRestore, since approving isn't destructive
const { approveRenewals } = useAssociatesMutations()
const toast = useToast()

// "Seleziona tutti": selects every currently filtered/visible row, against the same row model
// selectedRosterAssociates resolves against
function selectAllRosterAssociates() {
  selection.setAll(
    (table.value?.tableApi?.getFilteredRowModel().rows ?? []).map(row => row.original.id),
    true
  )
}
async function confirmApproveRenewals() {
  const ids = selectedRosterAssociates.value.map(associate => associate.id)
  if (!ids.length) return
  selection.clear()
  try {
    await approveRenewals.mutateAsync(ids)
    toast.add({
      title: t('associate.bulkActions.approveRenewalSuccessToast', ids.length),
      color: 'success'
    })
  } catch (err) {
    toast.add({
      title: t('associate.bulkActions.approveRenewalErrorToast'),
      description: toErrorMessage(err),
      color: 'error'
    })
  }
}
// A single search box matching name/email/phone/tax code, not a per-column filter. UTable's
// globalFilter/globalFilterOptions, not a hand-rolled ref+watch pair (see
// associatesGlobalFilterFn.ts). Declared before the columns destructure since
// useAssociatesTableColumns needs it to highlight matches. useState (not ref) so the typed text
// survives navigating to /associates/requests and back (a plain ref resets when this page
// unmounts); it shares its key with requests.vue's search on purpose, so switching between the two
// carries the same text over
const search = useState('associates-search', () => '')

// fallow-ignore-next-line code-duplication -- mirrors requests.vue's (different columns)
const {
  columnHeaders, visibilityItems, telegramUsernames,
  selectColumn, idColumn, createdAtColumn, updatedAtColumn, updatedByColumn,
  lastRenewalDateColumn, pauperwaveAssociateNumberColumn, membershipRequestStatusColumn,
  associateTypeColumn, consentDataColumn, consentSocialColumn,
  telegramStatusColumn, telegramUsernameColumn, hasReadStatuteColumn,
  firstNameColumn, lastNameColumn, emailAddressColumn, phoneNumberColumn, taxCodeColumn,
  bornDateColumn, ageColumn, bornLocationColumn, bornProvinceColumn, bornStateColumn,
  residencyAddressColumn, residencyHouseNumberColumn, residencyCityColumn,
  residencyProvinceColumn, residencyCapColumn,
  actionsColumn
} = useAssociatesTableColumns(
  selection, table, associates, rowContextMenuItems, search,
  // "Mostra colonne" section dividers: ID/UUID, Stato/Tesseramento, Consensi, Anagrafica, Nascita,
  // Residenza, Trail (see columnVisibilityGroups.ts). This page has a createdAtColumn requests.vue
  // doesn't (requests have no "created" moment distinct from the request itself), so the Trail
  // group's boundary id differs (created_at here vs updated_by there)
  [
    'membership_request_status', 'consent_data', 'first_name',
    'born_date', 'residency_address', 'created_at'
  ]
)

// Also matches the Telegram nickname, read live from the bot-link map
const globalFilterFn = createAssociatesGlobalFilterFn(uuid => telegramUsernames.value?.get(uuid))

// Wires the sidebar links (/associates?status=pending|active|to_renew) to the membership_status
// column filter. "pending_renewal" filters a different column entirely: it isn't a
// membership_status value but derives from pauperwave_associate_membership_events (see the
// has_pending_renewal column below), so the two filters are mutually exclusive.
//
// Replaces columnFilters.value wholesale instead of calling column.setFilterValue() on columns from
// table.value?.tableApi (still done by requests.vue, which has no has_pending_renewal column to
// race against): that mutates TanStack's internal state while UTable's v-model:column-filters
// controls the same state declaratively. Switching status=pending_renewal -> status=active left the
// table showing only the pending-renewal row: the second setFilterValue call (clearing
// has_pending_renewal) lost the race against UTable's prop-watcher re-syncing from the still-stale
// columnFilters ref. Assigning columnFilters.value makes it the one source of truth
function applyMembershipStatusFilterFromQuery() {
  const status = route.query.status
  if (status === 'pending_renewal') {
    columnFilters.value = [{ id: 'has_pending_renewal', value: true }]
  } else if (typeof status === 'string') {
    columnFilters.value = [{ id: 'membership_status', value: status }]
  } else {
    columnFilters.value = []
  }
}

// No longer needs nextTick to wait for UTable to mount — columnFilters is a
// plain ref this page owns, not something read off table.value?.tableApi.
onMounted(applyMembershipStatusFilterFromQuery)
watch(() => route.query.status, applyMembershipStatusFilterFromQuery)

// Real counts per membership status, for the tabs above the table (they replace the
// old static sidebar links). No 'pending' here anymore — rosterAssociates never
// contains pending requests in the first place.
const associatesStatusCounts = computed(() => {
  const counts = { active: 0, to_renew: 0, expired: 0 }
  for (const associate of rosterAssociates.value) {
    if (associate.membership_status in counts) {
      counts[associate.membership_status as keyof typeof counts]++
    }
  }
  return counts
})

// Rendered via the generic StatusFilterGroup (also used by wanted-cards), not UTabs: toggle buttons
// filter the table below rather than switching views. `count` is optional per item
// (StatusFilterGroup shows the nested UBadge only when set). Icons reused from
// MEMBERSHIP_STATUS_BADGE_CONFIG (the single source for status icons, like transactions' typeTabs),
// icon-only below `lg` via StatusFilterGroup's icon prop
const statusTabs = computed(() => [
  { label: t('associate.tabs.all'), value: 'all' as const, count: undefined },
  {
    label: t('associate.tabs.active'),
    value: 'active' as const,
    count: associatesStatusCounts.value.active,
    icon: MEMBERSHIP_STATUS_BADGE_CONFIG.active.icon
  },
  {
    label: t('associate.tabs.pendingRenewal'),
    value: 'pending_renewal' as const,
    count: pendingRenewalUuids.value?.size,
    icon: ICONS.calendarRenew
  },
  {
    label: t('associate.tabs.toRenew'),
    value: 'to_renew' as const,
    count: associatesStatusCounts.value.to_renew,
    icon: MEMBERSHIP_STATUS_BADGE_CONFIG.to_renew.icon
  },
  {
    label: t('associate.tabs.expired'),
    value: 'expired' as const,
    count: associatesStatusCounts.value.expired,
    icon: MEMBERSHIP_STATUS_BADGE_CONFIG.expired.icon
  }
])

const activeStatusTab = computed({
  get: () => (typeof route.query.status === 'string' ? route.query.status : 'all'),
  set: (value: string | number) => {
    router.replace({ query: { ...route.query, status: value === 'all' ? undefined : value } })
  }
})

const columnFilters = ref<{ id: string, value: unknown }[]>([])

const columnVisibility = ref({
  // Always "approved" here now that pending/rejected requests live on their
  // own page (/associates/requests) — redundant on every row in the roster.
  membership_request_status: false,
  uuid: false,
  // Audit trail (created_at/updated_at/updated_by), last in the column order: not needed at a
  // glance, like requests.vue's and wanted-cards' hidden columns
  created_at: false,
  updated_at: false,
  updated_by: false,
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
  residency_cap: false
})

const columns: TableColumn<Associate>[] = [
  selectColumn,
  idColumn,
  {
    accessorKey: 'uuid',
    header: columnHeaders.uuid,
    cell: ({ row }) => renderNeutralBadge(row.original.uuid)
  },
  membershipRequestStatusColumn,
  {
    accessorKey: 'membership_status',
    header: ({ column }) => sortableHeader(columnHeaders.membership_status, column),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    sortingFn: (rowA, rowB) => {
      const a = MEMBERSHIP_STATUS_SORT_ORDER[rowA.original.membership_status] ?? 99
      const b = MEMBERSHIP_STATUS_SORT_ORDER[rowB.original.membership_status] ?? 99
      return a - b
    },
    cell: ({ row }) => h(MembershipStatusBadge, { status: row.original.membership_status })
  },
  // Purely accessorFn-derived (no real pauperwave_associates column): backs the "Richieste (di
  // rinnovo)" tab's column filter (applyMembershipStatusFilterFromQuery above), and doubles as an
  // at-a-glance badge on every other tab
  {
    id: 'has_pending_renewal',
    accessorFn: (row: Associate) => pendingRenewalUuids.value?.has(row.uuid) ?? false,
    header: t('associate.columns.hasPendingRenewal'),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => (pendingRenewalUuids.value?.has(row.original.uuid)
      ? h(UBadge, {
        label: t('associate.badges.renewalRequested'),
        icon: ICONS.calendarRenew,
        color: 'primary',
        variant: 'subtle'
      })
      : null)
  },
  lastRenewalDateColumn,
  {
    accessorKey: 'association_date',
    header: ({ column }) => sortableHeader(columnHeaders.association_date, column),
    meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
    cell: ({ row }) =>
      h(DateWithRelativeTooltip, { isoString: row.original.association_date, time: false })
  },
  associateTypeColumn,
  pauperwaveAssociateNumberColumn,
  consentDataColumn,
  consentSocialColumn,
  telegramStatusColumn,
  telegramUsernameColumn,
  hasReadStatuteColumn,
  {
    accessorKey: 'has_acknowledged_surveillance_notice',
    header: ({ column }) =>
      sortableHeader(columnHeaders.has_acknowledged_surveillance_notice, column),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => h(ConsentBadge, { value: row.original.has_acknowledged_surveillance_notice })
  },
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
  createdAtColumn,
  updatedByColumn,
  updatedAtColumn,
  actionsColumn
]

function renderNeutralBadge(value: string) {
  return h(UBadge, {
    variant: 'subtle',
    color: 'neutral',
    class: 'font-mono',
    label: String(value)
  })
}
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

      <!-- Switcher shared with /associates/requests (see AssociatesSubNav), the same
           sub-nav-row pattern as /settings -->
      <UDashboardToolbar>
        <div id="tour-associates-subnav" class="w-fit">
          <AssociatesSubNav
            :pending-count="pendingCount"
            :associates-count="rosterAssociates.length"
          />
        </div>
      </UDashboardToolbar>

      <!-- Status filter, search/social/columns filters and row-actions in one toolbar row, with
           the #left/#right split of wanted-cards' UDashboardToolbar. Status is a UFieldGroup of
           toggle UButtons, not UTabs: it filters the table below rather than switching views -->
      <UDashboardToolbar
        v-if="viewMode === 'table'"
        :ui="{ root: 'flex-wrap h-auto py-2 gap-1.5', left: 'gap-4 flex-wrap', right: 'gap-4' }"
      >
        <template #left>
          <AssociatesListBulkActionsBar
            v-if="selectedRosterAssociates.length"
            side="left"
            :count="selectedRosterAssociates.length"
            :total="table?.tableApi?.getFilteredRowModel().rows.length || 0"
            @clear="selection.clear()"
            @select-all="selectAllRosterAssociates"
          />
          <div
            v-else
            id="tour-associates-filters"
            class="flex items-center gap-4 flex-wrap"
          >
            <AssociatesListFiltersBar
              v-model:active-status-tab="activeStatusTab"
              v-model:search="search"
              :status-tabs="statusTabs"
            />
          </div>
        </template>

        <template #right>
          <AssociatesListBulkActionsBar
            v-if="selectedRosterAssociates.length"
            side="right"
            :count="selectedRosterAssociates.length"
            :total="table?.tableApi?.getFilteredRowModel().rows.length || 0"
            show-renew
            :show-approve-renewal="activeStatusTab === 'pending_renewal'"
            @renew="requestBulkRenew(selectedRosterAssociates)"
            @approve-renewal="confirmApproveRenewals"
          />
          <div
            v-else
            id="tour-associates-actions"
            class="flex items-center gap-2"
          >
            <YearRangePicker v-model="range" :years="availableRenewalYears" />
            <AssociatesTableToolbarActions :visibility-items="visibilityItems" />
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <template v-if="viewMode === 'table'">
        <!-- ListSkeleton only for a genuine first load (isPending, no cached rows yet): a
             background refetch keeps the rows and uses UTable's :loading bar, like
             tournaments/locations' list pages -->
        <ListSkeleton
          v-if="isPending"
          :count="skeletonCount"
          :columns="columns.length"
        />

        <UContextMenu v-else :items="tableContextMenuItems">
          <UTable
            id="tour-associates-table"
            ref="table"
            v-model:column-filters="columnFilters"
            v-model:column-visibility="columnVisibility"
            v-model:global-filter="search"
            :global-filter-options="{ globalFilterFn }"
            :virtualize="{
              estimateSize: 35,
              overscan: 12
            }"
            :data="filteredRosterAssociates"
            :columns="columns"
            class="flex-1 h-80 shrink-0"
            :ui="{ tr: 'cursor-pointer' }"
            :loading="loading"
            sticky="header"
            @contextmenu="onRowContextmenu"
            @select="(_e, row) => navigateTo(
              `/associate/${slugify(`${row.original.first_name} ${row.original.last_name}`)}`
            )"
          />
        </UContextMenu>
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
  <AssociatesListNumberModal v-model="numberModalOpen" :associate="editingNumberAssociate" />
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
    :confirm-disabled="!receivedBy || !feeReady"
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
