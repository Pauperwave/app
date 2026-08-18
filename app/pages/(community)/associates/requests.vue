<!-- app\pages\(community)\associates\requests.vue -->
<script setup lang="ts">
import type { Table } from '@tanstack/vue-table'
import type { Associate } from '~/types'

const {
  data: associates, isLoading: loading, status, refetch
} = useAssociatesQuery()
const { t } = useI18n()
const toast = useToast()
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

const table = useTemplateRef<{ tableApi: Table<Associate> }>('table')
const {
  editingAssociate, editModalOpen,
  renewingAssociate, renewModalOpen,
  tableContextMenuItems, onRowContextmenu, rowContextMenuItems
} = useAssociatesRowActions()

// Bulk "Rifiuta" next to the existing bulk "Approva" — same selected-rows
// source (UTable's own row-selection, via `table.tableApi`), through
// ConfirmModal rather than a bespoke modal like ApproveModal.vue (that one
// predates ConfirmModal.vue).
const { rejectAssociates, restoreAssociates } = useAssociatesMutations()
const undoable = useUndoableAction()
const rejectConfirmOpen = ref(false)
const approveConfirmOpen = ref(false)
const selectedRequestAssociates = computed<Associate[]>(() =>
  table.value?.tableApi?.getFilteredSelectedRowModel().rows.map(row => row.original) ?? [])
const selectedRequestIds = computed(() =>
  selectedRequestAssociates.value.map(associate => associate.id))
const selectedRejectedIds = computed(() => selectedRequestAssociates.value
  .filter(associate => associate.membership_request_status === 'rejected')
  .map(associate => associate.id))

// Closes the modal immediately and defers the actual reject behind a
// 10-second undo window (useUndoableAction.ts) instead of awaiting the
// mutation on confirm.
function confirmReject() {
  const ids = selectedRequestIds.value
  if (!ids.length) return
  rejectConfirmOpen.value = false

  undoable.run({
    title: t('associate.rejectModal.undoToast', ids.length),
    commit: async () => {
      try {
        await rejectAssociates.mutateAsync(ids)
        toast.add({
          title: t('associate.rejectModal.successToastTitle'),
          description: t('associate.rejectModal.successToastDescription', ids.length),
          color: 'success'
        })
      } catch (err) {
        toast.add({
          title: t('associate.rejectModal.errorToastTitle'),
          description: toErrorMessage(err),
          color: 'error'
        })
      }
    }
  })
}

// Bulk "Ripristina" — the counterpart to bulk reject, for rows already
// rejected (from a previous session/page load, unlike the reject undo-toast
// above which only covers the last 10s). No confirm step, same directness as
// the single-row approve() in useAssociatesRowActions.ts — reverting a
// rejection isn't destructive, worst case it can be re-rejected.
async function bulkRestore() {
  const ids = selectedRejectedIds.value
  if (!ids.length) return
  try {
    await restoreAssociates.mutateAsync(ids)
    toast.add({
      title: t('associate.restoreModal.successToastTitle'),
      description: t('associate.restoreModal.successToastDescription', ids.length),
      color: 'success'
    })
  } catch (err) {
    toast.add({
      title: t('associate.restoreModal.errorToastTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  }
}

// fallow-ignore-next-line code-duplication -- see the same comment in
// associates/index.vue
const { columns, visibilityItems }
  = useAssociatesRequestsTableColumns(table, associates, rowContextMenuItems)

// fallow-ignore-next-line code-duplication -- see the same comment in
// associates/index.vue
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
  // Traceability/roster-preview columns (2026-08-13, matching the roster's
  // own set) — useful but not needed at a glance while triaging the queue.
  id: false,
  updated_at: false,
  updated_by: false,
  payment_date: false,
  pauperwave_associate_number: false,
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

// Same convention as associates/index.vue: point at this deploy's own
// /tesseramento for now, until the subdomain is wired up in DNS (docs/TODO.md).
// Lives here, not on the roster: sharing the public form is part of the
// request-intake workflow, not roster management.
const tesseramentoLink = computed(() => `${useRequestURL().origin}/tesseramento`)
const informativaDatiLink = computed(() => `${useRequestURL().origin}/tesseramento/informativa-dati`)

const tour = useAssociatesRequestsTour()
</script>

<template>
  <UDashboardPanel id="associates-requests">
    <template #header>
      <ListPageNavbar
        :title="$t('associate.subNav.requests')"
        :tour-label="$t('associate.requestsTour.startButton')"
        :loading="loading"
        :status="status"
        :ui="{ right: 'gap-2' }"
        @refresh="refetch"
        @tour-start="tour.start()"
      >
        <div id="tour-requests-add">
          <AssociatesListAddModal v-model="isModalOpen" />
        </div>

        <USeparator orientation="vertical" class="h-4" />

        <div id="tour-requests-links" class="flex items-center gap-2">
          <CopyOpenLinkPair
            :url="tesseramentoLink"
            :copy-label="$t('associate.copyTesseramentoLink')"
            :open-label="$t('associate.openTesseramentoLink')"
          />

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
        </div>

        <USeparator orientation="vertical" class="h-4" />

        <NotificationsBellButton />
      </ListPageNavbar>

      <!-- Switcher shared with /associates (see AssociatesSubNav). -->
      <UDashboardToolbar>
        <div id="tour-requests-subnav" class="w-fit">
          <AssociatesSubNav :pending-count="pendingCount" />
        </div>
      </UDashboardToolbar>

      <UDashboardToolbar
        :ui="{ root: 'flex-wrap h-auto py-2 gap-1.5', left: 'gap-4 flex-wrap', right: 'gap-4' }"
      >
        <template #left>
          <AssociatesListBulkActionsBar
            v-if="selectedRequestAssociates.length"
            side="left"
            :count="selectedRequestAssociates.length"
            @clear="table?.tableApi?.resetRowSelection()"
          />
          <div v-else id="tour-requests-filters">
            <StatusFilterGroup v-model="activeStatusTab" :items="statusTabs" />
          </div>
        </template>

        <template #right>
          <AssociatesListBulkActionsBar
            v-if="selectedRequestAssociates.length"
            side="right"
            :count="selectedRequestAssociates.length"
            show-approve
            show-reject
            :show-restore="!!selectedRejectedIds.length"
            @approve="approveConfirmOpen = true"
            @reject="rejectConfirmOpen = true"
            @restore="bulkRestore"
          />
          <AssociatesTableToolbarActions v-else :visibility-items="visibilityItems" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UContextMenu :items="tableContextMenuItems">
        <UTable
          id="tour-requests-table"
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
          @contextmenu="onRowContextmenu"
        />
      </UContextMenu>

      <TableSelectionFooter
        :selected="table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0"
        :total="table?.tableApi?.getFilteredRowModel().rows.length || 0"
      />
    </template>
  </UDashboardPanel>

  <AssociatesListEditModal v-model="editModalOpen" :associate="editingAssociate" />
  <TransactionsListAddModal
    v-model="renewModalOpen"
    :preset-associate="renewingAssociate"
    hide-trigger
  />

  <AssociatesListApproveModal
    v-model:open="approveConfirmOpen"
    :ids="selectedRequestIds"
  />

  <ConfirmModal
    v-model:open="rejectConfirmOpen"
    :title="$t('associate.rejectModal.title', selectedRequestIds.length)"
    :confirm-label="$t('associate.rejectModal.reject')"
    :confirm-icon="ICONS.statusRejected"
    @confirm="confirmReject"
  >
    <ul v-if="selectedRequestAssociates.length" class="max-h-40 overflow-y-auto text-sm space-y-1">
      <li v-for="associate in selectedRequestAssociates" :key="associate.id">
        <AssociateTag
          :name="`${associate.first_name} ${associate.last_name}`"
          :associate-uuid="associate.uuid"
        />
      </li>
    </ul>
  </ConfirmModal>

  <TourGuide :tour="tour" />
</template>
