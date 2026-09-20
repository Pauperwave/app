<!-- app\components\tournaments\single\pairing\SwissStandingsTable.vue -->
<!-- Swiss standings with the tiebreak columns (OMW%, GW%, OGW%) always visible. -->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { LiveSwissStanding } from '~/composables/tournaments/pairing/useLiveSwissStandings'

const { standings } = defineProps<{
  standings: LiveSwissStanding[]
}>()

const { t } = useI18n()

// standings arrive already ranked, so a row's position is its rank.
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
  <UTable
    v-if="standings.length > 0"
    :data="standings"
    :columns="columns"
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
      {{ row.index + 1 }}
    </template>
    <template #player-cell="{ row }">
      <div class="flex items-center gap-1.5">
        <AssociateTag
          :name="row.original.label"
          :associate-uuid="row.original.associateUuid"
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
      {{ formatPercentage(row.original.omw) }}
    </template>
    <template #gw-cell="{ row }">
      {{ formatPercentage(row.original.gw) }}
    </template>
    <template #ogw-cell="{ row }">
      {{ formatPercentage(row.original.ogw) }}
    </template>
  </UTable>

  <EmptyState
    v-else
    :message="t('tournament.single.roundManager.standingsEmpty')"
  />
</template>
