<!-- app\components\tournaments\single\pairing\SwissStandingsTable.vue -->
<!-- Swiss standings with the tiebreak columns (OMW%, GW%, OGW%) always visible. -->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { LiveSwissStanding } from '~/composables/tournaments/pairing/useLiveSwissStandings'

const { standings, pendingPlayerUuids = [] } = defineProps<{
  standings: LiveSwissStanding[]
  // Players whose table in the current round has no result yet.
  pendingPlayerUuids?: string[]
}>()

const { t } = useI18n()

const search = ref('')

// Filtering keeps each player's real rank, not their position in the filtered list.
const rankByPlayerUuid = computed(() =>
  new Map(standings.map((standing, index) => [standing.playerUuid, index + 1])))
const filteredStandings = computed(() =>
  standings.filter(standing => matchesRoundStatusSearch(standing.label, search.value)))

const tableMeta = {
  class: {
    tr: (row: { original: LiveSwissStanding }) =>
      pendingPlayerUuids.includes(row.original.playerUuid) ? 'bg-warning/10' : ''
  }
}

// No match played yet: the tiebreaks would only show the 33.3% floor.
function hasPlayed(standing: LiveSwissStanding): boolean {
  return standing.wins + standing.draws + standing.losses > 0
}

const columns = computed<TableColumn<LiveSwissStanding>[]>(() => [
  { id: 'rank', header: '#', meta: { class: { td: 'font-mono' } } },
  { id: 'player', header: t('tournament.single.roundManager.playerColumn') },
  { id: 'points', accessorKey: 'matchPoints', meta: { class: { th: 'text-right', td: 'text-right font-mono font-semibold' } } },
  { id: 'record', meta: { class: { th: 'text-right', td: 'text-right font-mono whitespace-nowrap' } } },
  { id: 'omw', meta: { class: { th: 'text-right', td: 'text-right font-mono' } } },
  { id: 'gw', meta: { class: { th: 'text-right', td: 'text-right font-mono' } } },
  { id: 'ogw', meta: { class: { th: 'text-right', td: 'text-right font-mono' } } }
])

// The % sign lives in the column headers, not in every cell.
function formatPercentage(value: number): string {
  return (value * 100).toFixed(1)
}
</script>

<template>
  <SearchInput
    v-if="standings.length > 0"
    v-model="search"
    :placeholder="t('tournament.single.roundManager.matchSearchPlaceholder')"
    class="mb-2 w-full"
  />
  <EmptyState
    v-if="standings.length > 0 && filteredStandings.length === 0"
    :message="t('tournament.single.roundManager.matchNoSearchResults')"
  />
  <UTable
    v-else-if="standings.length > 0"
    :data="filteredStandings"
    :columns="columns"
    :meta="tableMeta"
    :ui="{ th: 'border-r-0', td: 'border-r-0' }"
  >
    <template #points-header>
      <UTooltip :text="t('tournament.single.roundManager.standingsPointsTooltip')">
        <span>{{ t('tournament.single.roundManager.standingsPoints') }}</span>
      </UTooltip>
    </template>
    <template #record-header>
      <UTooltip :text="t('tournament.single.roundManager.standingsRecordTooltip')">
        <span>V-P-S</span>
      </UTooltip>
    </template>
    <template #omw-header>
      <UTooltip :text="t('tournament.single.roundManager.standingsOmwTooltip')">
        <span>OMW%</span>
      </UTooltip>
    </template>
    <template #gw-header>
      <UTooltip :text="t('tournament.single.roundManager.standingsGwTooltip')">
        <span>GW%</span>
      </UTooltip>
    </template>
    <template #ogw-header>
      <UTooltip :text="t('tournament.single.roundManager.standingsOgwTooltip')">
        <span>OGW%</span>
      </UTooltip>
    </template>

    <template #rank-cell="{ row }">
      {{ rankByPlayerUuid.get(row.original.playerUuid) }}
    </template>
    <template #player-cell="{ row }">
      <div class="flex items-center gap-1.5">
        <AssociateTag
          :name="row.original.label"
          :associate-uuid="row.original.associateUuid"
          :highlight-query="search"
        />
        <UBadge
          v-if="row.original.dropped"
          :label="t('tournament.single.roundManager.dropBadge', {
            round: row.original.dropped.roundNumber
          })"
          color="warning"
          variant="subtle"
          size="sm"
        />
      </div>
    </template>
    <template #record-cell="{ row }">
      {{ row.original.wins }}-{{ row.original.draws }}-{{ row.original.losses }}
    </template>
    <template #omw-cell="{ row }">
      {{ hasPlayed(row.original) ? formatPercentage(row.original.omw) : '–' }}
    </template>
    <template #gw-cell="{ row }">
      {{ hasPlayed(row.original) ? formatPercentage(row.original.gw) : '–' }}
    </template>
    <template #ogw-cell="{ row }">
      {{ hasPlayed(row.original) ? formatPercentage(row.original.ogw) : '–' }}
    </template>
  </UTable>

  <EmptyState
    v-else
    :message="t('tournament.single.roundManager.standingsEmpty')"
  />
</template>
