<!-- app\components\tournaments\single\prizes\PrizeDistributionTable.vue -->
<!--
  Standings with the packs each placement gets: the rewarded rows first, then
  a collapsible section (closed by default) for the players outside the
  rewards. Share and packs are linked — editing either one updates the other,
  and the parent rebalances the rest so every pack stays assigned. Not
  persisted — an on-screen adjustment for the organizer while handing out
  boosters.
-->
<script setup lang="ts">
import type { PrizeDistributionRowData } from './PrizeDistributionRow.vue'

const { rows, rewardedCount } = defineProps<{
  rows: PrizeDistributionRowData[]
  // Rows at index >= rewardedCount are outside the rewarded placements
  rewardedCount: number
  minPacks: number
  maxPacks: number
}>()

const emit = defineEmits<{
  updatePacks: [rank: number, packs: number]
  stepShare: [rank: number, direction: 1 | -1]
}>()

const { t } = useI18n()

// Briefly tint rows whose pack count just changed (green = gained, red = lost)
const { flashes } = useChangeFlash(() => rows.map(row => ({
  key: row.associateUuid,
  value: row.packs
})))

// Keep each row's placement (index in the full standings) next to it
const placedRows = computed(() => rows.map((row, rank) => ({ row, rank })))
const rewardedRows = computed(() => placedRows.value.slice(0, rewardedCount))
const nonRewardedRows = computed(() => placedRows.value.slice(rewardedCount))

const isNonRewardedOpen = ref(false)
</script>

<template>
  <div class="rounded-md border border-default">
    <div class="divide-y divide-default">
      <TournamentsSinglePrizesPrizeDistributionRow
        v-for="{ row, rank } in rewardedRows"
        :key="row.associateUuid"
        :row="row"
        :rank="rank"
        :min-packs="minPacks"
        :max-packs="maxPacks"
        :flash="flashes[row.associateUuid]"
        @update-packs="(placement, packs) => emit('updatePacks', placement, packs)"
        @step-share="(placement, direction) => emit('stepShare', placement, direction)"
      />
    </div>

    <UCollapsible
      v-if="nonRewardedRows.length > 0"
      v-model:open="isNonRewardedOpen"
      class="border-t border-default"
    >
      <button
        type="button"
        class="flex w-full cursor-pointer items-center gap-1.5 bg-elevated/50 px-3 py-1.5"
      >
        <span class="flex-1 text-left text-xs font-medium uppercase tracking-wide text-muted">
          {{
            t('tournament.single.prizeDistribution.notRewardedDivider', { count: rewardedCount })
          }}
        </span>
        <span class="text-xs text-muted">{{ nonRewardedRows.length }}</span>
        <UIcon
          :name="ICONS.chevronDown"
          class="size-3.5 text-muted transition-transform"
          :class="isNonRewardedOpen ? '' : '-rotate-90'"
        />
      </button>

      <template #content>
        <div class="divide-y divide-default border-t border-default">
          <TournamentsSinglePrizesPrizeDistributionRow
            v-for="{ row, rank } in nonRewardedRows"
            :key="row.associateUuid"
            :row="row"
            :rank="rank"
            :min-packs="minPacks"
            :max-packs="maxPacks"
            :flash="flashes[row.associateUuid]"
            muted
          />
        </div>
      </template>
    </UCollapsible>
  </div>
</template>
