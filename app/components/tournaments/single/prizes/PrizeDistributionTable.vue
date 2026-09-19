<!-- app\components\tournaments\single\prizes\PrizeDistributionTable.vue -->
<!--
  Per-placement rows for the rewarded players: a share (% of the bonus pool)
  and a pack count, linked — editing either one updates the other, and the
  parent rebalances the rest so every pack stays assigned. Not persisted —
  an on-screen adjustment for the organizer while handing out boosters.
-->
<script setup lang="ts">
interface PrizeDistributionRow {
  associateUuid: string
  label: string
  packs: number
  // Percent of the bonus pool for this placement; null outside the rewarded ones
  sharePercent: number | null
}

const { rows, rewardedCount } = defineProps<{
  rows: PrizeDistributionRow[]
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

// Shares come from whole packs, so at most one decimal (e.g. 9.1%)
function formatShare(share: number): string {
  return `${Math.round(share * 10) / 10}%`
}

// Briefly tint rows whose pack count just changed (green = gained, red = lost)
const flashes = ref<Record<string, 'gain' | 'loss'>>({})
let previousPacks = new Map<string, number>()
let flashTimer: ReturnType<typeof setTimeout> | undefined

watch(() => rows.map(row => row.packs), () => {
  const changes: Record<string, 'gain' | 'loss'> = {}
  for (const row of rows) {
    const before = previousPacks.get(row.associateUuid)
    if (before !== undefined && before !== row.packs) {
      changes[row.associateUuid] = row.packs > before ? 'gain' : 'loss'
    }
  }
  previousPacks = new Map(rows.map(row => [row.associateUuid, row.packs]))

  if (Object.keys(changes).length === 0) return
  flashes.value = changes
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    flashes.value = {}
  }, 900)
}, { immediate: true })

onBeforeUnmount(() => clearTimeout(flashTimer))
</script>

<template>
  <div class="divide-y divide-default rounded-md border border-default">
    <template
      v-for="(row, index) in rows"
      :key="row.associateUuid"
    >
      <div
        v-if="index === rewardedCount"
        class="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted bg-elevated/50"
      >
        {{ t('tournament.single.prizeDistribution.notRewardedDivider', { count: rewardedCount }) }}
      </div>

      <div
        class="flex items-center gap-3 px-3 py-2 transition-colors duration-500"
        :class="{
          'opacity-60': index >= rewardedCount,
          'bg-success/20': flashes[row.associateUuid] === 'gain',
          'bg-error/20': flashes[row.associateUuid] === 'loss'
        }"
      >
        <span class="w-8 shrink-0 text-center font-mono text-sm text-muted">
          #{{ index + 1 }}
        </span>

        <AssociateTag
          :name="row.label"
          :associate-uuid="row.associateUuid"
          size="md"
          class="flex-1"
        />

        <!-- Buttons only, no typing: each step moves exactly one pack -->
        <div
          v-if="row.sharePercent !== null"
          class="flex w-32 items-center justify-between rounded-md ring ring-inset ring-accented"
        >
          <UButton
            :icon="ICONS.subtract"
            :disabled="row.packs <= minPacks"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="emit('stepShare', index, -1)"
          />
          <span class="font-mono text-sm tabular-nums">{{ formatShare(row.sharePercent) }}</span>
          <UButton
            :icon="ICONS.add"
            :disabled="row.packs >= maxPacks"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="emit('stepShare', index, 1)"
          />
        </div>
        <div
          v-else
          class="w-32"
        />

        <UInputNumber
          :model-value="row.packs"
          :min="minPacks"
          :max="maxPacks"
          :disabled="row.sharePercent === null"
          class="w-28"
          :icon="ICONS.booster"
          @update:model-value="value => emit('updatePacks', index, Number(value ?? 0))"
        />
      </div>
    </template>
  </div>
</template>
