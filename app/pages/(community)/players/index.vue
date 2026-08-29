<!-- app\pages\(community)\players\index.vue -->
<script lang="ts" setup>
import type { VisibilityTableRef } from '~/composables/useColumnVisibilityItems'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

useSeoMeta({ title: () => t('player.breadcrumb') })

const {
  data: playersData, isLoading: loading, isPending, status, refetch
} = usePlayersQuery()
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

// Same StatusFilterGroup used by associates/index.vue and wanted-cards/index.vue
// (a UFieldGroup of toggle buttons), not UTabs. Icons reused from
// MEMBERSHIP_STATUS_BADGE_CONFIG's own active/expired (success/banned) — same
// active-vs-not semantics as membership status — collapsing to icon-only
// below `lg` via StatusFilterGroup's own icon prop (user request, 2026-08-24).
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

// Same single search box as associates/index.vue (user request, 2026-08-19)
// — see playersGlobalFilterFn.ts.
const search = ref('')

// Own query, own cache key — last_sign_in_at lives in auth.users, not
// players_full, so it can't ride along with usePlayersQuery.ts's own fetch
// (server/api/players/last-logins.get.ts, 2026-08-20 user request).
const { data: lastLoginsData } = usePlayersLastLoginsQuery()
const lastLogins = computed(() => new Map(
  (lastLoginsData.value ?? []).map(entry => [entry.playerUuid, entry.lastSignInAt])
))

const tour = usePlayersTour()

const {
  onRowContextmenu, tableContextMenuItems,
  deletingPlayer, deleteConfirmOpen, deleting, confirmDelete
} = usePlayersRowActions()

// Same data useMembersMutations.ts/usePlayersRowActions.ts already read for
// the "Promuovi a" submenu — reused here for the "Ruolo" column instead of a
// second query (user request, 2026-08-25).
const { data: membersData } = useMembersQuery()
const roleByAssociateUuid = computed(() =>
  new Map((membersData.value ?? []).map(member => [member.associateUuid, member.role])))

const { columns, columnHeaders } = usePlayersTableColumns(search, lastLogins, roleByAssociateUuid)
const sorting = ref([{ id: 'id', desc: false }])

// Same "Mostra colonne" pattern as wanted-cards/index.vue: rebuilt every time
// the menu opens (via :items"), getAllColumns() + getCanHide() +
// toggleVisibility(), not a direct v-model on the individual items (official
// Nuxt UI convention, UTable docs "Column visibility" section).
const table = useTemplateRef<VisibilityTableRef>('table')
const columnVisibility = ref({})

// "Mostra colonne" section divider: identity/status columns vs. activity
// trail (see columnVisibilityGroups.ts, user request 2026-08-27).
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

      <!-- Same #left toolbar placement as associates/index.vue and
           wanted-cards/index.vue for their StatusFilterGroup. -->
      <UDashboardToolbar>
        <template #left>
          <div id="tour-players-filters" class="flex items-center gap-4 flex-wrap">
            <StatusFilterGroup v-model="activeStatusTab" :items="statusTabs" />

            <SearchInput
              v-model="search"
              class="w-56 sm:w-64 lg:w-72"
              :placeholder="$t('player.searchPlaceholder')"
            />
          </div>
        </template>

        <template #right>
          <div id="tour-players-actions">
            <ColumnVisibilityMenu :items="columnVisibilityItems" />
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <ListSkeleton v-if="isPending" :count="skeletonCount" :columns="columns.length" />
      <UContextMenu v-else :items="tableContextMenuItems">
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
            <div class="py-12 text-center text-muted">
              {{ $t('player.empty') }}
            </div>
          </template>
        </UTable>
      </UContextMenu>
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
</template>
