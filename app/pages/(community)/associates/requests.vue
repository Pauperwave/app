<!-- app\pages\(community)\associates\requests.vue -->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Associate } from '~/types'

const {
  data: associates, isLoading: loading, status, refetch
} = useAssociatesQuery()
const { t } = useI18n()
const { isModalOpen } = useModalOpenFromQuery()

// The other half of the 2026-08-11 UX split (see associates/index.vue) —
// everyone NOT yet approved: the triage queue an admin actually needs to act
// on, kept out of the roster entirely instead of buried in a status filter.
const requestAssociates = computed(() => (associates.value ?? []).filter(
  associate => associate.membership_request_status !== 'approved'
))
const pendingCount = computed(() => (associates.value ?? []).filter(
  associate => associate.membership_request_status === 'pending'
).length)

const route = useRoute()
const router = useRouter()

const table = useTemplateRef('table')
const {
  visibilityItems,
  selectColumn, membershipRequestStatusColumn, requestDateColumn, associateTypeColumn,
  consentDataColumn, consentSocialColumn, hasReadStatuteColumn,
  firstNameColumn, lastNameColumn, emailAddressColumn, phoneNumberColumn, taxCodeColumn,
  bornDateColumn, bornLocationColumn, bornProvinceColumn, bornStateColumn,
  residencyAddressColumn, residencyHouseNumberColumn, residencyCityColumn,
  residencyProvinceColumn, residencyCapColumn, mtgoNicknameColumn, mtgaNicknameColumn
} = useAssociateTableColumns(table)

function applyRequestStatusFilterFromQuery() {
  const statusColumn = table.value?.tableApi?.getColumn('membership_request_status')
  if (!statusColumn) return
  const status = route.query.status
  statusColumn.setFilterValue(typeof status === 'string' ? status : undefined)
}

onMounted(() => nextTick(applyRequestStatusFilterFromQuery))
watch(() => route.query.status, applyRequestStatusFilterFromQuery)

const requestStatusCounts = computed(() => {
  const counts = { pending: 0, rejected: 0 }
  for (const associate of requestAssociates.value) {
    if (associate.membership_request_status in counts) {
      counts[associate.membership_request_status as keyof typeof counts]++
    }
  }
  return counts
})

// Default tab is 'pending', not 'all' — this page opens straight on the
// queue that actually needs action, not a mixed pending+rejected list.
const statusTabs = computed(() => [
  { label: t('associate.tabs.all'), value: 'all' as const, count: undefined },
  { label: t('associate.tabs.pending'), value: 'pending' as const, count: requestStatusCounts.value.pending },
  { label: t('associate.tabs.rejected'), value: 'rejected' as const, count: requestStatusCounts.value.rejected }
])

const activeStatusTab = computed({
  get: () => (typeof route.query.status === 'string' ? route.query.status : 'pending'),
  set: (value: string | number) => {
    router.replace({ query: { ...route.query, status: value === 'pending' ? undefined : value } })
  }
})

// Oldest request first — a queue is worked front-to-back, not the roster's
// insertion-order default.
const sorting = ref([{ id: 'request_date', desc: false }])

const columnFilters = ref([])

// Birth/residency/MTG detail stay available (toggleable) but hidden by
// default — same "not needed at a glance" reasoning as the roster's own
// columnVisibility, just a different set of columns qualifying. Keys must
// match each column's accessorKey (snake_case) exactly — column visibility
// is keyed by column id, not a display name, so camelCase keys here
// silently match nothing and leave the column visible.
const columnVisibility = ref({
  // Mandatory to submit /tesseramento — always true, redundant on every row.
  consent_data: false,
  has_read_statute: false,
  born_date: false,
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
  membershipRequestStatusColumn,
  requestDateColumn,
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

// Same convention as associates/index.vue: point at this deploy's own
// /tesseramento for now, until the subdomain is wired up in DNS (docs/TODO.md).
// Lives here, not on the roster: sharing the public form is part of the
// request-intake workflow, not roster management.
const tesseramentoLink = computed(() => `${useRequestURL().origin}/tesseramento`)
const informativaDatiLink = computed(() => `${useRequestURL().origin}/tesseramento/informativa-dati`)
</script>

<template>
  <UDashboardPanel id="associates-requests">
    <template #header>
      <UDashboardNavbar :title="$t('associate.subNav.requests')" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <AssociatesListAddModal v-model="isModalOpen" />

          <USeparator orientation="vertical" class="h-4" />

          <CopyLinkButton :url="tesseramentoLink" :label="$t('associate.copyTesseramentoLink')" />
          <UTooltip :text="$t('associate.openTesseramentoLink')">
            <UButton
              :to="tesseramentoLink"
              target="_blank"
              :icon="ICONS.externalLink"
              :aria-label="$t('associate.openTesseramentoLink')"
              color="neutral"
              variant="outline"
              square
            />
          </UTooltip>

          <USeparator orientation="vertical" class="h-4" />

          <UTooltip :text="$t('associate.openInformativaDatiLink')">
            <UButton
              :to="informativaDatiLink"
              target="_blank"
              :icon="ICONS.externalLink"
              :aria-label="$t('associate.openInformativaDatiLink')"
              color="neutral"
              variant="outline"
              square
            />
          </UTooltip>

          <USeparator orientation="vertical" class="h-4" />

          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>

      <!-- Switcher shared with /associates (see AssociatesSubNav). -->
      <UDashboardToolbar>
        <AssociatesSubNav :pending-count="pendingCount" />
      </UDashboardToolbar>

      <UDashboardToolbar
        :ui="{ root: 'flex-wrap h-auto py-2 gap-1.5', left: 'gap-4 flex-wrap', right: 'gap-4' }"
      >
        <template #left>
          <StatusFilterGroup v-model="activeStatusTab" :items="statusTabs" />
        </template>

        <template #right>
          <AssociatesListApproveModal
            v-if="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
            :ids="table.tableApi.getFilteredSelectedRowModel().rows.map(row => row.original.id)"
          >
            <UButton
              :label="$t('associate.approveModal.approve')"
              color="success"
              variant="subtle"
              :icon="ICONS.confirm"
            >
              <template #trailing>
                <UKbd>
                  {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length }}
                </UKbd>
              </template>
            </UButton>
          </AssociatesListApproveModal>

          <QueryRefreshControl :is-loading="loading" :status="status" @refresh="refetch" />

          <UDropdownMenu :items="visibilityItems" :content="{ align: 'end' }">
            <UButton
              :label="$t('common.showColumns')"
              color="neutral"
              variant="outline"
              :trailing-icon="ICONS.settingsColumns"
            />
          </UDropdownMenu>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UTable
        ref="table"
        v-model:sorting="sorting"
        v-model:column-filters="columnFilters"
        v-model:column-visibility="columnVisibility"
        v-model:row-selection="rowSelection"
        :virtualize="{
          estimateSize: 35,
          overscan: 12
        }"
        :data="requestAssociates"
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

      <div class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto">
        <div class="text-sm text-muted">
          {{ $t('associate.selectedRows', {
            selected: table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0,
            total: table?.tableApi?.getFilteredRowModel().rows.length || 0
          }) }}
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
