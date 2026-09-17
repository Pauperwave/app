<!-- app\pages\(analytics)\statistics\decks\index.vue -->
<!-- Deck-pairing browsing hub — ported from MagicTheGathering/league's
     pages/decks/index.vue (user request, 2026-09-17: restore the feature
     league had that never made it into this app's first commander-pages
     port). Simpler than league's version: commander_stats already has one
     row per unique commander pair, so there's no separate dedup step. -->
<script setup lang="ts">
import type { TableColumn, TabsItem } from '@nuxt/ui'
import { NuxtLink } from '#components'
import type { CommanderStatsPair } from '~/composables/commanders/useCommanderStatsQuery'
import type { CommanderCard } from '~/composables/commanders/useCommanderCards'

const { t } = useI18n()

const viewMode = ref<'table' | 'dense' | 'grid'>('grid')
const viewModeItems = computed<TabsItem[]>(() => [
  { label: t('deck.views.table'), value: 'table', icon: ICONS.table },
  { label: t('deck.views.dense'), value: 'dense', icon: ICONS.gridDense },
  { label: t('deck.views.grid'), value: 'grid', icon: ICONS.grid }
])

const { data: pairsData, isLoading: pairsLoading } = useAllCommanderStats()
const pairs = computed(() => pairsData.value ?? [])

const sortOptions = [
  { label: t('deck.sortOptions.alphabetical'), value: 'alphabetical', icon: ICONS.sortAlpha },
  { label: t('deck.sortOptions.popularity'), value: 'popularity', icon: ICONS.players },
  { label: t('deck.sortOptions.frequency'), value: 'frequency', icon: ICONS.battle },
  { label: t('deck.sortOptions.color'), value: 'color', icon: ICONS.palette },
  { label: t('deck.sortOptions.manaCost'), value: 'mana-cost', icon: ICONS.manaCost }
]

const selectedSort = ref('alphabetical')
const sortDirection = ref<'asc' | 'desc'>('asc')

function toggleDirection() {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
}

const uniqueCommanderNames = computed(() => [...new Set(pairs.value.map(p => p.commander1Name))])
const needsCommanderData = computed(() => selectedSort.value === 'color' || selectedSort.value === 'mana-cost')
const { data: commanderCacheData, isLoading: commanderLoading } = useCommandersByNamesQuery(
  uniqueCommanderNames, needsCommanderData
)
const commanderCache = computed(() => commanderCacheData.value ?? new Map<string, CommanderCard>())

function getCommanderData(pair: CommanderStatsPair): CommanderCard | undefined {
  return commanderCache.value.get(pair.commander1Name)
}

function compareAlphabetical(a: CommanderStatsPair, b: CommanderStatsPair): number {
  return a.commander1Name.localeCompare(b.commander1Name)
}
function comparePopularity(a: CommanderStatsPair, b: CommanderStatsPair): number {
  return a.playerCount - b.playerCount
}
function compareFrequency(a: CommanderStatsPair, b: CommanderStatsPair): number {
  return a.matchCount - b.matchCount
}
function colorSortKey(pair: CommanderStatsPair): string {
  const colors = getCommanderData(pair)?.colorIdentity ?? []
  if (colors.length === 0) return 'ZZZZ'
  const count = colors.length.toString().padStart(2, '0')
  const order = [...colors]
    .sort((c1, c2) => WUBRG_ORDER.indexOf(c1) - WUBRG_ORDER.indexOf(c2))
    .join('')
  return `${count}${order}`
}
function compareColor(a: CommanderStatsPair, b: CommanderStatsPair): number {
  return colorSortKey(a).localeCompare(colorSortKey(b))
}
function compareManaCost(a: CommanderStatsPair, b: CommanderStatsPair): number {
  return (getCommanderData(a)?.cmc ?? 0) - (getCommanderData(b)?.cmc ?? 0)
}

const SORT_COMPARATORS: Record<string, (a: CommanderStatsPair, b: CommanderStatsPair) => number> = {
  'alphabetical': compareAlphabetical,
  'popularity': comparePopularity,
  'frequency': compareFrequency,
  'color': compareColor,
  'mana-cost': compareManaCost
}

const sortedPairs = computed(() => {
  const list = [...pairs.value]
  const comparator = SORT_COMPARATORS[selectedSort.value] ?? compareAlphabetical
  const multiplier = sortDirection.value === 'asc' ? 1 : -1
  list.sort((a, b) => comparator(a, b) * multiplier)
  return list
})

// Table view reuses sortedPairs as-is -- sorting is already handled by the
// toolbar's own select+direction toggle above (shared by all 3 view modes),
// so this table doesn't need its own per-column sortable headers.
function pairName(pair: CommanderStatsPair): string {
  return [pair.commander1Name, pair.commander2Name].filter(Boolean).join(' / ')
}
function pairSlug(pair: CommanderStatsPair): string {
  return slugify(pair.commander1Name)
}
function statColumn(
  accessorKey: keyof CommanderStatsPair, label: string
): TableColumn<CommanderStatsPair> {
  return {
    accessorKey,
    header: () => label,
    meta: { class: { th: 'text-center', td: 'text-center px-3 py-1.5' } }
  }
}
const tableColumns: TableColumn<CommanderStatsPair>[] = [
  {
    id: 'name',
    header: t('deck.nameColumn'),
    cell: ({ row }) => h(
      NuxtLink,
      { to: `/statistics/decks/${pairSlug(row.original)}`, class: 'hover:underline' },
      () => pairName(row.original)
    )
  },
  statColumn('playerCount', t('deck.statsPlayers')),
  statColumn('matchCount', t('deck.statsMatches')),
  statColumn('winCount', t('deck.statsWins')),
  statColumn('totalKills', t('deck.statsKills'))
]

const showLoadingState = computed(() =>
  (pairsLoading.value || commanderLoading.value) && sortedPairs.value.length === 0)

useSeoMeta({ title: () => t('deck.breadcrumb') })
</script>

<template>
  <UDashboardPanel id="statistics">
    <template #header>
      <UDashboardNavbar :title="t('deck.breadcrumb')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <ViewModeTabs v-model="viewMode" :items="viewModeItems" />

          <USeparator orientation="vertical" class="h-4" />

          <USelectMenu
            v-model="selectedSort"
            :items="sortOptions"
            value-key="value"
            label-key="label"
            icon-key="icon"
            class="w-48"
          />
          <UButton
            variant="ghost"
            color="neutral"
            size="sm"
            :icon="sortDirection === 'asc' ? ICONS.sortAscNumeric : ICONS.sortDescNumeric"
            @click="toggleDirection"
          />
          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <ListSkeleton
        v-if="viewMode === 'table' && showLoadingState"
        :columns="tableColumns.length"
      />

      <div
        v-else-if="viewMode !== 'table' && showLoadingState"
        class="grid gap-4"
        :class="viewMode === 'dense'
          ? 'grid-cols-[repeat(auto-fill,minmax(min(140px,42vw),1fr))]'
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'"
      >
        <template v-if="viewMode === 'dense'">
          <CommandersDeckDenseCard
            v-for="n in 16"
            :key="n"
            loading
          />
        </template>
        <template v-else>
          <CommandersDeckCardSkeleton v-for="n in 8" :key="n" />
        </template>
      </div>

      <EmptyState v-else-if="sortedPairs.length === 0" :message="t('deck.emptyList')" />

      <UTable
        v-else-if="viewMode === 'table'"
        :data="sortedPairs"
        :columns="tableColumns"
      >
        <template #empty>
          <EmptyState :message="t('deck.emptyList')" />
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
          <CommandersDeckDenseCard
            v-for="pair in sortedPairs"
            :key="`${pair.commander1Name}|${pair.commander2Name ?? ''}`"
            :pair="pair"
          />
        </template>
        <template v-else>
          <CommandersDeckCard
            v-for="pair in sortedPairs"
            :key="`${pair.commander1Name}|${pair.commander2Name ?? ''}`"
            :pair="pair"
          />
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
