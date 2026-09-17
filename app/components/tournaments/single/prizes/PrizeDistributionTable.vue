<!-- app\components\tournaments\single\prizes\PrizeDistributionTable.vue -->
<!--
  Per-player suggested pack count, with a manual override input (not
  persisted — an on-screen adjustment for the organizer while handing out
  boosters, see Prizes.vue's not-persisted notice).
-->
<script setup lang="ts">
interface PrizeDistributionRow {
  associateUuid: string
  label: string
  suggestedPacks: number
  overridePacks: number | null
}

const { rows } = defineProps<{
  rows: PrizeDistributionRow[]
}>()

const emit = defineEmits<{
  override: [associateUuid: string, packs: number | null]
}>()

const { t } = useI18n()
</script>

<template>
  <div class="divide-y divide-default rounded-md border border-default">
    <div
      v-for="(row, index) in rows"
      :key="row.associateUuid"
      class="flex items-center gap-3 px-3 py-2"
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

      <span class="text-sm text-muted">
        {{ t('tournament.single.prizeDistribution.suggested', { count: row.suggestedPacks }) }}
      </span>

      <UInputNumber
        :model-value="row.overridePacks ?? row.suggestedPacks"
        :min="0"
        class="w-28"
        :icon="ICONS.booster"
        @update:model-value="value => emit(
          'override', row.associateUuid, value === null ? null : Number(value)
        )"
      />
    </div>
  </div>
</template>
