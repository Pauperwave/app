<!-- app\components\tournaments\single\pairing\CommanderStandingsTable.vue -->
<!-- Commander standings with the score breakdown columns (victories, kills, votes, deaths). -->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { SortingState } from '@tanstack/vue-table'
import type { LiveCommanderStanding } from '~/composables/tournaments/pairing/useLiveCommanderStandings'

const { tournamentUuid, standings } = defineProps<{
  tournamentUuid: string
  standings: LiveCommanderStanding[]
}>()

const { t } = useI18n()

const search = ref('')
// Empty = the standings' own order (rank); a header click re-sorts from there.
const sorting = ref<SortingState>([])

// Filtering/sorting keeps each player's real rank, not their position in the shown list.
const rankByPlayerUuid = computed(() =>
  new Map(standings.map((standing, index) => [standing.playerUuid, index + 1])))
const filteredStandings = computed(() =>
  standings.filter(standing => matchesRoundStatusSearch(standing.label, search.value)))

const { copyToClipboard } = useCopyToClipboard()

// The player whose "pagella" is open.
const reportOpen = ref(false)
const reportPlayerUuid = ref<string | null>(null)
const reportPlayer = computed(() =>
  standings.find(standing => standing.playerUuid === reportPlayerUuid.value) ?? null)

function openReport(playerUuid: string) {
  reportPlayerUuid.value = playerUuid
  reportOpen.value = true
}

// Header row + rank, player, score — the table's first three columns, in rank order.
function copyStandingsCsv() {
  const header = [
    '#',
    t('tournament.single.roundManager.playerColumn'),
    t('tournament.single.roundManager.standingsScoreHeader')
  ]
  const rows = standings.map((standing, index) => [index + 1, standing.label, standing.score])
  return copyToClipboard(
    toCsv([header, ...rows]),
    t('tournament.single.roundManager.standingsCsvCopiedTitle')
  )
}

// Same colors as the award cards (TournamentAwardCard.vue); zeros fade so the real values stand
// out.
const VALUE_COLOR_CLASS = {
  score: 'text-primary font-semibold',
  victories: 'text-primary',
  kills: 'text-warning',
  brewReceived: 'text-info',
  playReceived: 'text-success',
  deaths: 'text-error'
} as const

function valueClass(column: keyof typeof VALUE_COLOR_CLASS, value: number): string {
  return value === 0 ? 'text-dimmed' : VALUE_COLOR_CLASS[column]
}

const numericColumnMeta = { class: { th: 'text-center', td: 'text-center font-mono' } }

const columns = computed<TableColumn<LiveCommanderStanding>[]>(() => [
  { id: 'rank', header: '#', meta: { class: { td: 'font-mono' } } },
  {
    id: 'player',
    accessorFn: standing => standing.label,
    header: ({ column }) => sortableHeader(t('tournament.single.roundManager.playerColumn'), column, ICONS.player)
  },
  {
    accessorKey: 'score',
    header: ({ column }) => sortableHeader(t('tournament.single.roundManager.standingsScoreHeader'), column, ICONS.medal),
    meta: { class: { th: 'text-center', td: 'text-center font-mono font-semibold' } }
  },
  {
    accessorKey: 'victories',
    header: ({ column }) => sortableHeader(t('tournament.single.roundManager.standingsVictoriesHeader'), column, ICONS.standings),
    meta: numericColumnMeta
  },
  {
    accessorKey: 'kills',
    header: ({ column }) => sortableHeader(t('tournament.single.roundManager.standingsKillsHeader'), column, ICONS.kills),
    meta: numericColumnMeta
  },
  {
    accessorKey: 'brewReceived',
    header: ({ column }) => sortableHeader(t('tournament.single.roundManager.standingsBrewHeader'), column, ICONS.brewVotes),
    meta: numericColumnMeta
  },
  {
    accessorKey: 'playReceived',
    header: ({ column }) => sortableHeader(t('tournament.single.roundManager.standingsPlayHeader'), column, ICONS.playVotes),
    meta: numericColumnMeta
  },
  {
    accessorKey: 'deaths',
    header: ({ column }) => sortableHeader(t('tournament.single.roundManager.standingsDeathsHeader'), column, ICONS.deaths),
    meta: numericColumnMeta
  },
  { id: 'actions', header: '', meta: { class: { td: 'text-right' } } }
])
</script>

<template>
  <UCard
    v-if="standings.length > 0"
    :ui="{ header: 'p-3 sm:p-3', body: 'p-0 sm:p-0' }"
  >
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <SearchInput
          v-model="search"
          class="w-64 sm:w-80"
          :placeholder="t('tournament.single.roundManager.matchSearchPlaceholder')"
        />
        <UButton
          :icon="ICONS.copy"
          :label="t('tournament.single.roundManager.standingsCopyCsv')"
          color="neutral"
          variant="outline"
          @click="copyStandingsCsv"
        />
      </div>
    </template>

    <UTable
      v-model:sorting="sorting"
      :data="filteredStandings"
      :columns="columns"
      sticky="header"
    >
      <template #empty>
        <EmptyState :message="t('tournament.single.roundManager.matchNoSearchResults')" />
      </template>

      <template #rank-cell="{ row }">
        {{ rankByPlayerUuid.get(row.original.playerUuid) }}
      </template>
      <template #score-cell="{ row }">
        <span :class="valueClass('score', row.original.score)">{{ row.original.score }}</span>
      </template>
      <template #victories-cell="{ row }">
        <span :class="valueClass('victories', row.original.victories)">{{ row.original.victories }}</span>
      </template>
      <template #kills-cell="{ row }">
        <span :class="valueClass('kills', row.original.kills)">{{ row.original.kills }}</span>
      </template>
      <template #brewReceived-cell="{ row }">
        <span :class="valueClass('brewReceived', row.original.brewScore)">
          {{ row.original.brewScore }} ({{ row.original.brewReceived }})
        </span>
      </template>
      <template #playReceived-cell="{ row }">
        <span :class="valueClass('playReceived', row.original.playScore)">
          {{ row.original.playScore }} ({{ row.original.playReceived }})
        </span>
      </template>
      <template #actions-cell="{ row }">
        <UButton
          :label="t('tournament.single.roundManager.standingsDetailButton')"
          :icon="ICONS.show"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="openReport(row.original.playerUuid)"
        />
      </template>
      <template #deaths-cell="{ row }">
        <span :class="valueClass('deaths', row.original.deaths)">{{ row.original.deaths }}</span>
      </template>
      <template #player-cell="{ row }">
        <div class="flex items-center gap-1.5">
          <AssociateTag
            :name="row.original.firstName"
            :surname="row.original.surname"
            :associate-uuid="row.original.associateUuid"
            :highlight-query="search"
          />
          <TournamentsSinglePairingDropBadge :dropped="row.original.dropped" />
        </div>
      </template>
    </UTable>

    <TournamentsSinglePairingCommanderPlayerReportModal
      v-model:open="reportOpen"
      :tournament-uuid="tournamentUuid"
      :standings="standings"
      :player="reportPlayer"
      @select-player="openReport"
    />
  </UCard>

  <EmptyState
    v-else
    :message="t('tournament.single.roundManager.standingsEmpty')"
  />
</template>
