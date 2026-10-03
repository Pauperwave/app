<!-- app\pages\(community)\players\index.vue -->
<script lang="ts" setup>
import type { VisibilityTableRef } from '~/composables/useColumnVisibilityItems'

// The route is gated like the sidebar link (view-players): it used to be nav-hidden only, with the
// route open to any authenticated user (see the permissions.vue table's statusNote)
definePageMeta({ permission: 'view-players' })

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

useSeoMeta({ title: () => t('player.breadcrumb') })

const {
  data: playersData, isLoading: loading, isPending, status, refetch
} = usePlayersFullQuery()
const data = computed(() => playersData.value ?? [])

// Real counts per status, same convention as associatesStatusCounts in
// associates/index.vue — StatusFilterGroup only renders the trailing count
// badge when `count` is actually set on the item.
const playersStatusCounts = computed(() => {
  const counts = { active: 0, inactive: 0 }
  for (const player of data.value) {
    if (player.is_active) counts.active++
    else counts.inactive++
  }
  return counts
})

// The same StatusFilterGroup as associates/index.vue and wanted-cards/index.vue (a UFieldGroup of
// toggle buttons), not UTabs. Icons reused from MEMBERSHIP_STATUS_BADGE_CONFIG's active/expired
// (success/banned), the same active-vs-not semantics as membership status, icon-only below `lg` via
// StatusFilterGroup's icon prop
const statusTabs = computed(() => [
  { label: t('player.tabs.active'), value: 'active', count: playersStatusCounts.value.active, icon: ICONS.success },
  { label: t('player.tabs.inactive'), value: 'inactive', count: playersStatusCounts.value.inactive, icon: ICONS.banned }
])

const activeStatusTab = computed({
  get: () => (typeof route.query.status === 'string' ? route.query.status : 'active'),
  set: (value: string | number) => {
    router.replace({ query: { ...route.query, status: value === 'active' ? undefined : value } })
  }
})

const filteredPlayers = computed(() => data.value.filter(
  player => (activeStatusTab.value === 'active' ? player.is_active : !player.is_active)
))

// The same single search box as associates/index.vue (see playersGlobalFilterFn.ts)
const search = ref('')

// Own query, own cache key: last_sign_in_at lives in auth.users, not players_full, so it can't ride
// along with usePlayersQuery.ts's fetch (see server/api/players/last-logins.get.ts)
const { data: lastLoginsData } = usePlayersLastLoginsQuery()
const lastLogins = computed(() => new Map(
  (lastLoginsData.value ?? []).map(entry => [entry.playerUuid, entry.lastSignInAt])
))

const tour = usePlayersTour()

const {
  onRowContextmenu, tableContextMenuItems,
  deletingPlayer, deleteConfirmOpen, deleting, confirmDelete
} = usePlayersRowActions()

// The data useMembersMutations.ts/usePlayersRowActions.ts read for the "Promuovi a" submenu, reused
// for the "Ruolo" column instead of a second query
const { data: membersData } = useMembersQuery()
const roleByAssociateUuid = computed(() =>
  new Map((membersData.value ?? []).map(member => [member.associateUuid, member.role])))

// Checkbox selection + bulk delete via useSelection.ts, like transactions/index.vue's
// selectedTransactions: filtered against filteredPlayers (not the raw dataset) so a selection
// hidden by the active status tab/search isn't actionable. Not useSelectedTableRows.ts: that needs
// a full tableApi ref (getFilteredRowModel), while `table` here is typed as the lighter
// VisibilityTableRef of the "Mostra colonne" menu
const selection = useSelection<number>()
const table = useTemplateRef<VisibilityTableRef>('table')
const selectedPlayers = computed(() =>
  filteredPlayers.value.filter(player => selection.isSelected(player.id)))
const {
  confirmOpen: bulkDeleteConfirmOpen, deleting: bulkDeleting,
  requestDelete: requestBulkDelete, confirmDelete: confirmBulkDelete
} = usePlayersBulkActions(selection)

const { columns, columnHeaders } = usePlayersTableColumns(
  selection, search, lastLogins, roleByAssociateUuid
)
const sorting = ref([{ id: 'id', desc: false }])

// The "Mostra colonne" pattern of wanted-cards/index.vue: rebuilt every time the menu opens (via
// :items), getAllColumns() + getCanHide() + toggleVisibility(), not a v-model on the items (the
// official Nuxt UI convention, UTable docs "Column visibility")
const columnVisibility = ref({})

// "Mostra colonne" section divider: identity/status columns vs activity trail (see
// columnVisibilityGroups.ts)
const columnVisibilityItems = useColumnVisibilityItems(
  table, columnVisibility, columnHeaders, ['created_at']
)

const skeletonCount = computed(() => (isPending.value ? undefined : filteredPlayers.value.length))
</script>

<template>
  <UDashboardPanel id="players">
    <template #header>
      <ListPageNavbar
        :title="$t('player.breadcrumb')"
        :tour-label="$t('player.tour.startButton')"
        :loading="loading"
        :status="status"
        @refresh="refetch"
        @tour-start="tour.start()"
      >
        <NotificationsBellButton />
      </ListPageNavbar>

      <!-- The #left toolbar placement of associates/index.vue and wanted-cards/index.vue for
           their StatusFilterGroup, swapped for the bulk-actions bar (same row/height) while
           there is a selection -->
      <UDashboardToolbar :ui="{ root: 'flex-wrap h-auto py-2 gap-1.5', left: 'gap-4 flex-wrap' }">
        <template #left>
          <PlayersListBulkActionsBar
            v-if="selectedPlayers.length"
            side="left"
            :count="selectedPlayers.length"
            @clear="selection.clear()"
          />
          <div
            v-else
            id="tour-players-filters"
            class="flex items-center gap-4 flex-wrap"
          >
            <StatusFilterGroup v-model="activeStatusTab" :items="statusTabs" />

            <SearchInput
              v-model="search"
              class="w-56 sm:w-64 lg:w-72"
              :placeholder="$t('player.searchPlaceholder')"
            />
          </div>
        </template>

        <template #right>
          <PlayersListBulkActionsBar
            v-if="selectedPlayers.length"
            side="right"
            :count="selectedPlayers.length"
            @delete="requestBulkDelete(selectedPlayers)"
          />
          <div v-else id="tour-players-actions">
            <ColumnVisibilityMenu :items="columnVisibilityItems" />
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <ListSkeleton
        v-if="isPending"
        :count="skeletonCount"
        :columns="columns.length"
      />
      <template v-else>
        <UContextMenu :items="tableContextMenuItems">
          <UTable
            ref="table"
            v-model:sorting="sorting"
            v-model:column-visibility="columnVisibility"
            v-model:global-filter="search"
            :global-filter-options="{ globalFilterFn: playersGlobalFilterFn }"
            :data="filteredPlayers"
            :columns="columns"
            class="flex-1 h-80 shrink-0"
            :ui="{ tr: 'cursor-pointer' }"
            :loading="loading"
            sticky="header"
            @select="(_e, row) => navigateTo(
              `/players/${slugify(`${row.original.first_name} ${row.original.last_name}`)}`
            )"
            @contextmenu="onRowContextmenu"
          >
            <template #empty>
              <EmptyState
                :message="$t('player.empty')"
              />
            </template>
          </UTable>
        </UContextMenu>

        <TableSelectionFooter
          :selected="selectedPlayers.length"
          :total="filteredPlayers.length"
        />
      </template>
    </template>
  </UDashboardPanel>

  <TourGuide :tour="tour" />

  <ConfirmModal
    v-model:open="deleteConfirmOpen"
    :title="$t('player.rowActions.deleteConfirmTitle')"
    :warning="$t('common.confirmDeleteWarning')"
    :confirm-label="$t('player.rowActions.delete')"
    :confirm-icon="ICONS.delete"
    :loading="deleting"
    @confirm="confirmDelete"
  >
    <p v-if="deletingPlayer" class="text-sm text-muted">
      {{ deletingPlayer.first_name }} {{ deletingPlayer.last_name }}
    </p>
  </ConfirmModal>

  <ConfirmModal
    v-model:open="bulkDeleteConfirmOpen"
    :title="$t('player.bulkActions.deleteConfirmTitle', selectedPlayers.length)"
    :warning="$t('common.confirmDeleteWarning')"
    :confirm-label="$t('player.rowActions.delete')"
    :confirm-icon="ICONS.delete"
    :loading="bulkDeleting"
    @confirm="confirmBulkDelete"
  />
</template>
