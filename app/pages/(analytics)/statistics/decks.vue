<!-- app\pages\(analytics)\statistics\decks.vue -->
<!-- Deck-pairing browsing hub — ported from MagicTheGathering/league's
     pages/decks/index.vue (user request, 2026-09-17: restore the feature
     league had that never made it into this app's first commander-pages
     port). Simpler than league's version: commander_stats already has one
     row per unique commander pair, so there's no separate dedup step. -->
<script setup lang="ts">
import type { CommanderStatsPair } from '~/composables/commanders/useCommanderStatsQuery'
import type { CommanderCard } from '~/composables/commanders/useCommanderCards'

const { t } = useI18n()

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
      <div
        v-if="(pairsLoading || commanderLoading) && sortedPairs.length === 0"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        <CommandersDeckCardSkeleton v-for="n in 8" :key="n" />
      </div>

      <EmptyState v-else-if="sortedPairs.length === 0" :message="t('deck.emptyList')" />

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <CommandersDeckCard
          v-for="pair in sortedPairs"
          :key="`${pair.commander1Name}|${pair.commander2Name ?? ''}`"
          :pair="pair"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
