<!-- app\pages\(community)\associates\index.vue -->
<script setup lang="ts">
import type { TableColumn, TabsItem } from '@nuxt/ui'
import { UBadge } from '#components'
import type { Associate } from '~/types'
import ConsentBadge from '~/components/ui/ConsentBadge.vue'
import DateWithRelativeTooltip from '~/components/ui/DateWithRelativeTooltip.vue'
import MembershipStatusBadge from '~/components/ui/MembershipStatusBadge.vue'

// Lifecycle order, not alphabetical (TanStack's default) — matches the
// existing status tabs (Tutti/Attivi/Da rinnovare/Scaduti) and
// MEMBERSHIP_STATUS_BADGE_CONFIG's own key order, so "Tesseramento" sorts
// the same way an admin already thinks about the roster.
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
// "Richieste (di rinnovo)" tab (user request, 2026-08-27) — a Set, not
// baked into the Associate type, since it's derived from a separate table
// (pauperwave_associate_membership_events) rather than a real column on
// pauperwave_associates itself.
const { data: pendingRenewalUuids } = usePendingRenewalRequestsQuery()
const { t } = useI18n()

useSeoMeta({ title: () => t('associate.breadcrumb') })

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

// undefined (ListSkeleton's own default count) only on a genuine first load
// — isPending, unlike isLoading, is false once stale data exists to show a
// real count from, even mid-refetch (e.g. the manual refresh button), same
// convention as tournaments/locations' own list pages.
const skeletonCount = computed(() => (isPending.value ? undefined : rosterAssociates.value.length))

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

// Migrated off UTable's own row-selection state to the shared Set-based
// useSelection.ts (2026-08-19) — same as transactions'/wanted-cards'/
// tournaments'/leagues' tables, for Escape-to-clear and shift-click range
// selection, which this table never had. Selected associates resolved
// against the table's own filtered row model (not rosterAssociates), so a
// selection hidden by the active status/email/consent filter isn't
// actionable — same reasoning as wanted-cards' own selectedCards.
const selection = useSelection<number>()
const selectedRosterAssociates = useSelectedTableRows(table, selection)
const {
  pendingRenewal, confirmOpen: renewConfirmOpen, receivedBy, receiverOptions, feeReady,
  requestBulkRenew, confirmBulkRenew
} = useAssociatesBulkActions(selection)

// "Approva rinnovo" on the "Richieste (di rinnovo)" tab (user request,
// 2026-08-27) — acknowledging the request, not recording the payment (that
// stays the existing "Rinnova" flow above), so no undo-window/confirm
// modal: same directness as requests.vue's own bulkRestore, since approving
// isn't destructive.
const { approveRenewals } = useAssociatesMutations()
const toast = useToast()
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
// Single search box matching name/email/phone/tax code, not a per-column
// filter (user feedback, 2026-08-19 — replaced the email-only column filter
// and the separate consent-social dropdown, removed the same day). UTable's
// own globalFilter/globalFilterOptions, not a hand-rolled ref+watch pair —
// see associatesGlobalFilterFn.ts. Declared before the columns destructure
// below since useAssociatesTableColumns needs it to highlight matches.
const search = ref('')

// fallow-ignore-next-line code-duplication -- the useAssociatesTableColumns destructure
// and status-filter-from-query function mirror requests.vue's own (different column
// id and query semantics per page), not worth forcing into a shared helper
const {
  columnHeaders, visibilityItems,
  selectColumn, idColumn, createdAtColumn, updatedAtColumn, updatedByColumn,
  lastRenewalDateColumn, pauperwaveAssociateNumberColumn, membershipRequestStatusColumn,
  associateTypeColumn, consentDataColumn, consentSocialColumn, hasReadStatuteColumn,
  firstNameColumn, lastNameColumn, emailAddressColumn, phoneNumberColumn, taxCodeColumn,
  bornDateColumn, ageColumn, bornLocationColumn, bornProvinceColumn, bornStateColumn,
  residencyAddressColumn, residencyHouseNumberColumn, residencyCityColumn,
  residencyProvinceColumn, residencyCapColumn,
  actionsColumn
} = useAssociatesTableColumns(
  selection, table, associates, rowContextMenuItems, search,
  // "Mostra colonne" section dividers: ID/UUID, Stato/Tesseramento,
  // Consensi, Anagrafica, Nascita, Residenza, Trail (see
  // columnVisibilityGroups.ts, user request 2026-08-27) — this page has a
  // createdAtColumn requests.vue doesn't (association requests have no
  // "created" moment distinct from the request itself), so the Trail
  // group's own boundary id differs (created_at here vs updated_by there).
  [
    'membership_request_status', 'consent_data', 'first_name',
    'born_date', 'residency_address', 'created_at'
  ]
)

// Wires the sidebar links (/associates?status=pending|active|to_renew) to the
// membership_status column filter, which can only be applied after UTable mounts.
// "pending_renewal" (2026-08-27) filters a different column entirely — it's
// not a membership_status value, it's derived from
// pauperwave_associate_membership_events (see has_pending_renewal column
// below) — so the two filters are mutually exclusive, not combined.
// fallow-ignore-next-line code-duplication -- see the destructure comment above
function applyMembershipStatusFilterFromQuery() {
  const statusColumn = table.value?.tableApi?.getColumn('membership_status')
  const pendingRenewalColumn = table.value?.tableApi?.getColumn('has_pending_renewal')
  if (!statusColumn || !pendingRenewalColumn) return

  const status = route.query.status
  if (status === 'pending_renewal') {
    statusColumn.setFilterValue(undefined)
    pendingRenewalColumn.setFilterValue(true)
  } else {
    pendingRenewalColumn.setFilterValue(undefined)
    statusColumn.setFilterValue(typeof status === 'string' ? status : undefined)
  }
}

onMounted(() => nextTick(applyMembershipStatusFilterFromQuery))
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

// Rendered via the generic StatusFilterGroup (also used by wanted-cards), not
// UTabs: toggle buttons filter the table below rather than switching between
// separate views. `count` is optional per item — StatusFilterGroup only shows
// the nested UBadge when it's set.
// Icons reused from MEMBERSHIP_STATUS_BADGE_CONFIG (same "single source of
// truth for which icon represents which status" as transactions' typeTabs) —
// collapse to icon-only below `lg` via StatusFilterGroup's own icon prop
// (user request, 2026-08-24).
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

const columnFilters = ref([])

const columnVisibility = ref({
  // Always "approved" here now that pending/rejected requests live on their
  // own page (/associates/requests) — redundant on every row in the roster.
  membership_request_status: false,
  uuid: false,
  // Audit trail (created_at/updated_at/updated_by), moved to the end of the
  // column order 2026-08-18 — not needed at a glance, same "traceability"
  // reasoning as requests.vue's own hidden columns and wanted-cards'.
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
  // Purely accessorFn-derived (no real pauperwave_associates column) —
  // backs the "Richieste (di rinnovo)" tab's own column filter
  // (applyMembershipStatusFilterFromQuery above), and doubles as a visible
  // at-a-glance badge on every other tab too (user request, 2026-08-27).
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

      <!-- Switcher shared with /associates/requests (see AssociatesSubNav) —
           same sub-nav-row pattern as /settings. -->
      <UDashboardToolbar>
        <div id="tour-associates-subnav" class="w-fit">
          <AssociatesSubNav
            :pending-count="pendingCount"
            :associates-count="rosterAssociates.length"
          />
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
            @clear="selection.clear()"
          />
          <div v-else id="tour-associates-filters" class="flex items-center gap-4 flex-wrap">
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
            show-renew
            :show-approve-renewal="activeStatusTab === 'pending_renewal'"
            @renew="requestBulkRenew(selectedRosterAssociates)"
            @approve-renewal="confirmApproveRenewals"
          />
          <div v-else id="tour-associates-actions">
            <AssociatesTableToolbarActions :visibility-items="visibilityItems" />
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <template v-if="viewMode === 'table'">
        <!-- ListSkeleton only for a genuine first load (isPending, no
             cached rows yet) — a background refetch keeps the existing
             rows and uses UTable's own :loading bar instead, same
             convention as tournaments/locations' own list pages. -->
        <ListSkeleton v-if="isPending" :count="skeletonCount" :columns="columns.length" />

        <UContextMenu v-else :items="tableContextMenuItems">
          <UTable
            id="tour-associates-table"
            ref="table"
            v-model:column-filters="columnFilters"
            v-model:column-visibility="columnVisibility"
            v-model:global-filter="search"
            :global-filter-options="{ globalFilterFn: associatesGlobalFilterFn }"
            :virtualize="{
              estimateSize: 35,
              overscan: 12
            }"
            :data="rosterAssociates"
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

        <TableSelectionFooter
          :selected="selectedRosterAssociates.length"
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
