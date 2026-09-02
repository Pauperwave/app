<!-- app\components\finance\TournamentOverview.vue -->
<!-- Same tabs-switch shell as FormatOverview.vue/MonthlyOverview.vue, but the
two positions switch TournamentChart's `metric` prop (participants first,
incassato second) rather than alternating chart vs table — the table stays
separately visible below, unaffected by the switch (user request,
2026-09-02: "voglio che alterni i due grafici, non il grafico e la
tabella"). TournamentChart itself stays mounted across the switch so unovis
animates each line/point to its new value instead of snapping (user
request, 2026-09-03: "voglio animare le linee") — see its own header
comment. -->
<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import type { FinanceTournamentSummaryRow } from '~/composables/finance/useFinanceSummary'

const {
  rows, year, loading, pending = false
} = defineProps<{
  rows: FinanceTournamentSummaryRow[]
  year: number
  loading: boolean
  pending?: boolean
}>()

const { t } = useI18n()

const viewMode = ref<'participants' | 'revenue'>('participants')
const viewModeItems = computed<TabsItem[]>(() => [
  { label: t('finance.views.participants'), value: 'participants', icon: ICONS.players },
  { label: t('finance.views.revenue'), value: 'revenue', icon: ICONS.euro }
])
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-2">
      <div class="flex justify-end">
        <ViewModeTabs v-model="viewMode" :items="viewModeItems" />
      </div>

      <ClientOnly>
        <FinanceTournamentChart
          :rows="rows"
          :year="year"
          :metric="viewMode"
          :loading="loading"
        />
        <template #fallback>
          <StatisticsStatChartCardSkeleton />
        </template>
      </ClientOnly>
    </div>

    <FinanceTournamentSummaryTable
      :rows="rows"
      :loading="loading"
      :pending="pending"
    />
  </div>
</template>
