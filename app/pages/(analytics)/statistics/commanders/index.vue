<!-- app\pages\(analytics)\statistics\commanders\index.vue -->
<!--
  Commander catalog browse page — ported from MagicTheGathering/league's
  pages/commanders/index.vue (user request 2026-09-16: copy the
  decks/commanders/bracket features, adapted to this app), filling in what
  was a bare title-only stub. Reads commander_stats (migration
  20260919040000, a plain view — league's own commander_stats is a
  MATERIALIZED view needing a manual refresh, not needed at this app's
  scale) + the existing commander catalog (mana cost/color identity).
-->
<script setup lang="ts">
import type { TableColumn, TabsItem } from '@nuxt/ui'
import { USkeleton, MagicManaCost, NuxtLink } from '#components'

const { t } = useI18n()

useSeoMeta({ title: () => t('commander.breadcrumb') })

const { data: statsList, isLoading: statsLoading } = useAllCommanderStats()
const { data: catalogData, isLoading: catalogLoading } = useCommanderCatalogQuery()

const allNames = computed(() => getAllCommanderNames(statsList.value ?? []))
const catalogByName = computed(() => new Map((catalogData.value ?? []).map(row => [row.name, row])))

interface CommanderRow {
  name: string
  manaCost: string | null
  cmc: number | null
  colorIdentity: string[]
  artCropUrl: string | null
  playerCount: number
  matchCount: number
  winCount: number
  totalKills: number
  averageScore: number
}

const allRows = computed<CommanderRow[]>(() => allNames.value.map((name) => {
  const agg = aggregateSingleCommander(statsList.value ?? [], name)
  const catalogRow = catalogByName.value.get(name)
  return {
    name,
    manaCost: catalogRow?.manaCost ?? null,
    cmc: catalogRow?.cmc ?? null,
    colorIdentity: catalogRow?.colorIdentity ?? [],
    artCropUrl: catalogRow?.artCropUrl ?? null,
    playerCount: agg?.playerCount ?? 0,
    matchCount: agg?.matchCount ?? 0,
    winCount: agg?.winCount ?? 0,
    totalKills: agg?.totalKills ?? 0,
    averageScore: agg?.averageScore ?? 0
  }
}))

const viewMode = ref<'table' | 'dense' | 'grid'>('table')
const viewModeItems = computed<TabsItem[]>(() => [
  { label: t('commander.views.table'), value: 'table', icon: ICONS.table },
  { label: t('commander.views.dense'), value: 'dense', icon: ICONS.gridDense },
  { label: t('commander.views.grid'), value: 'grid', icon: ICONS.grid }
])

const search = ref('')
const filteredRows = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return allRows.value
  return allRows.value.filter(row => row.name.toLowerCase().includes(query))
})

function statColumn(
  accessorKey: keyof CommanderRow, label: string, color = ''
): TableColumn<CommanderRow> {
  return {
    accessorKey,
    header: ({ column }) => sortableHeader(label, column),
    cell: ({ getValue }) => {
      const value = getValue() as number
      return h('span', { class: color }, accessorKey === 'averageScore' ? value.toFixed(1) : String(value))
    },
    meta: { class: { th: 'text-center', td: 'text-center px-3 py-1.5' } }
  }
}

const columns: TableColumn<CommanderRow>[] = [
  {
    accessorKey: 'cmc',
    header: ({ column }) => sortableHeader(t('deck.sortOptions.manaCost'), column),
    sortingFn: (a, b) => {
      const colorDiff = colorGroupRank(a.original.colorIdentity)
        - colorGroupRank(b.original.colorIdentity)
      return colorDiff !== 0 ? colorDiff : (a.original.cmc ?? -1) - (b.original.cmc ?? -1)
    },
    cell: ({ row }) => catalogLoading.value
      ? h(USkeleton, { class: 'h-4 w-16' })
      : h(MagicManaCost, { manaCost: row.original.manaCost, size: 'sm' }),
    meta: { class: { td: 'px-3 py-1.5 w-32' } }
  },
  {
    accessorKey: 'name',
    header: ({ column }) => sortableHeader(t('commander.index.nameColumn'), column),
    cell: ({ row }) => h(
      NuxtLink,
      { to: `/statistics/commanders/${slugify(row.original.name)}`, class: 'hover:underline' },
      () => row.original.name
    )
  },
  statColumn('playerCount', t('deck.statsPlayers')),
  statColumn('matchCount', t('player.stats.matches')),
  statColumn('winCount', t('player.stats.wins'), 'text-warning'),
  statColumn('totalKills', t('player.stats.kills'), 'text-error'),
  statColumn('averageScore', t('player.stats.average'), 'text-success')
]

const isLoading = statsLoading
</script>

<template>
  <UDashboardPanel id="commanders">
    <template #header>
      <UDashboardNavbar :title="$t('commander.breadcrumb')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <ViewModeTabs v-model="viewMode" :items="viewModeItems" />

          <USeparator orientation="vertical" class="h-4" />

          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <SearchInput
            v-model="search"
            class="w-56 sm:w-64 lg:w-72"
            :placeholder="t('commander.index.searchPlaceholder')"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <ListSkeleton v-if="viewMode === 'table' && isLoading" :columns="columns.length" />

      <div
        v-else-if="viewMode !== 'table' && isLoading"
        class="grid gap-4"
        :class="viewMode === 'dense'
          ? 'grid-cols-[repeat(auto-fill,minmax(min(140px,42vw),1fr))]'
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'"
      >
        <template v-if="viewMode === 'dense'">
          <CommandersCommanderDenseCard
            v-for="n in 16"
            :key="n"
            loading
          />
        </template>
        <template v-else>
          <CommandersDeckCardSkeleton v-for="n in 8" :key="n" />
        </template>
      </div>

      <EmptyState v-else-if="filteredRows.length === 0" :message="t('commander.index.emptyList')" />

      <UTable
        v-else-if="viewMode === 'table'"
        :data="filteredRows"
        :columns="columns"
        :sorting="[{ id: 'name', desc: false }]"
        sticky="header"
      >
        <template #empty>
          <EmptyState :message="t('commander.index.emptyList')" />
        </template>
      </UTable>

      <div
        v-else
        class="grid gap-4"
        :class="viewMode === 'dense'
          ? 'grid-cols-[repeat(auto-fill,minmax(min(140px,42vw),1fr))]'
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'"
      >
        <template v-if="viewMode === 'dense'">
          <CommandersCommanderDenseCard
            v-for="row in filteredRows"
            :key="row.name"
            :row="row"
          />
        </template>
        <template v-else>
          <CommandersCommanderCard
            v-for="row in filteredRows"
            :key="row.name"
            :row="row"
            :loading="catalogLoading"
          />
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
