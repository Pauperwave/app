<!-- app\pages\(community)\associates\index.vue -->
<script setup lang="ts">
import type { TableColumn, TabsItem } from '@nuxt/ui'
import { upperFirst } from 'scule'
import { UBadge } from '#components'
import type { Associate } from '~/types'

const {
  data: associates, isLoading: loading, status, refetch
} = useAssociatesQuery()
const { data: geocodes, isLoading: geocodesLoading } = useAssociateGeocodesQuery()
const { t } = useI18n()
const { formatDateTime, formatDate, renderConsentBadge } = useAssociateRenderers()

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

const viewMode = ref<'table' | 'map'>('table')
const viewModeItems = computed<TabsItem[]>(() => [
  { label: t('associate.views.table'), value: 'table', icon: 'i-lucide-table' },
  { label: t('associate.views.map'), value: 'map', icon: 'i-lucide-map' }
])

const route = useRoute()
const router = useRouter()

const table = useTemplateRef('table')
const {
  columnHeaders, visibilityItems,
  selectColumn, membershipRequestStatusColumn, requestDateColumn, associateTypeColumn,
  consentDataColumn, consentSocialColumn, hasReadStatuteColumn,
  firstNameColumn, lastNameColumn, emailAddressColumn, phoneNumberColumn, taxCodeColumn,
  bornDateColumn, bornLocationColumn, bornProvinceColumn, bornStateColumn,
  residencyAddressColumn, residencyHouseNumberColumn, residencyCityColumn,
  residencyProvinceColumn, residencyCapColumn, mtgoNicknameColumn, mtgaNicknameColumn
} = useAssociateTableColumns(table)

// Wires the sidebar links (/associates?status=pending|active|to_renew) to the
// membership_status column filter, which can only be applied after UTable mounts.
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
  residency_cap: false,
  mtgo_nickname: false,
  mtga_nickname: false
})

const rowSelection = ref({})

const columns: TableColumn<Associate>[] = [
  selectColumn,
  {
    accessorKey: 'id',
    header: ({ column }) => sortableHeader(columnHeaders.id, column),
    meta: { class: { th: 'text-right', td: 'text-right font-mono' } },
    cell: ({ row }) => row.original.id
  },
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
  {
    accessorKey: 'updated_at',
    header: ({ column }) => sortableHeader(columnHeaders.updated_at, column),
    meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
    cell: ({ row }) => formatDateTime(row.original.updated_at)
  },
  {
    accessorKey: 'updated_by',
    header: columnHeaders.updated_by,
    cell: ({ row }) => row.original.updated_by
  },
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
  requestDateColumn,
  {
    accessorKey: 'payment_date',
    header: ({ column }) => sortableHeader(columnHeaders.payment_date, column),
    meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
    cell: ({ row }) => formatDate(row.original.payment_date)
  },
  {
    accessorKey: 'association_date',
    header: ({ column }) => sortableHeader(columnHeaders.association_date, column),
    meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
    cell: ({ row }) => formatDate(row.original.association_date)
  },
  associateTypeColumn,
  {
    accessorKey: 'pauperwave_associate_number',
    header: ({ column }) => sortableHeader(columnHeaders.pauperwave_associate_number, column),
    meta: { class: { th: 'text-right', td: 'text-right font-mono' } },
    cell: ({ row }) => row.original.pauperwave_associate_number || ''
  },
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

const consentSocialOptions = [
  { label: t('associate.consentSocialOptions.all'), value: 'all', icon: 'i-lucide-megaphone', color: 'neutral' },
  { label: t('associate.consentSocialOptions.yes'), value: 'yes', icon: ICONS.success, color: 'success' },
  { label: t('associate.consentSocialOptions.no'), value: 'no', icon: ICONS.clear, color: 'error' }
]

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
      <UDashboardNavbar :title="$t('associate.breadcrumb')" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <ViewModeTabs v-model="viewMode" :items="viewModeItems" />

          <USeparator orientation="vertical" class="h-4" />

          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>

      <!-- Switcher shared with /associates/requests (see AssociatesSubNav) —
           same sub-nav-row pattern as /settings. -->
      <UDashboardToolbar>
        <AssociatesSubNav :pending-count="pendingCount" />
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
          <StatusFilterGroup v-model="activeStatusTab" :items="statusTabs" />

          <UInput
            :model-value="(
              table?.tableApi?.getColumn('email_address')?.getFilterValue() as string
            )"
            class="max-w-sm"
            :icon="ICONS.search"
            :placeholder="$t('common.filterEmailsPlaceholder')"
            @update:model-value="
              table?.tableApi?.getColumn('email_address')?.setFilterValue($event)
            "
          />

          <UTooltip :text="$t('associate.consentSocialLabel')">
            <UStatusSelect
              v-model="consentSocialFilter"
              :items="consentSocialOptions"
              name="consentSocialFilter"
            />
          </UTooltip>
        </template>

        <template #right>
          <AssociatesTableToolbarActions
            :is-loading="loading"
            :status="status"
            :visibility-items="visibilityItems"
            @refresh="refetch"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <template v-if="viewMode === 'table'">
        <UTable
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
          :ui="{
            base: 'border-separate border-spacing-0',
            tbody: '[&>tr]:last:[&>td]:border-b-0',
            tr: 'hover:bg-elevated/50',
            th: 'border-r border-default last:border-r-0 py-2 px-2 font-medium',
            td: 'border-b border-r border-default last:border-r-0 py-1 px-2'
          }"
        />

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
</template>
