<!-- app\components\home\HomeStats.vue -->
<script setup lang="ts">
import type { Period, Range, Stat } from '~/types'

// period/range are wired up for when a real stats endpoint replaces the
// placeholder values below, kept as props so the parent binding stays intact.
defineProps<{
  // fallow-ignore-next-line unused-component-prop -- see comment above
  period: Period
  // fallow-ignore-next-line unused-component-prop -- see comment above
  range: Range
}>()

const { t } = useI18n()

// No backend feeds these stats yet — cards render with a placeholder value
// and no variation badge until a real endpoint is wired up.
const stats = computed<Stat[]>(() => [{
  title: t('home.stats.associates'),
  icon: ICONS.players,
  value: '—',
  variation: 0
}, {
  title: t('home.stats.conversions'),
  icon: ICONS.chartPie,
  value: '—',
  variation: 0
}, {
  title: t('home.stats.revenue'),
  icon: ICONS.badgeEuro,
  value: '—',
  variation: 0
}, {
  title: t('home.stats.orders'),
  icon: ICONS.shoppingCart,
  value: '—',
  variation: 0
}])
</script>

<template>
  <UPageGrid class="lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-px">
    <UPageCard
      v-for="(stat, index) in stats"
      :key="index"
      :icon="stat.icon"
      :title="stat.title"
      to="/associates"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
        title: 'font-normal text-muted text-xs uppercase'
      }"
      class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
    >
      <div class="flex items-center gap-2">
        <span class="text-2xl font-semibold text-highlighted">
          {{ stat.value }}
        </span>

        <UBadge
          v-if="stat.variation"
          :color="stat.variation > 0 ? 'success' : 'error'"
          variant="subtle"
          class="text-xs"
        >
          {{ stat.variation > 0 ? '+' : '' }}{{ stat.variation }}%
        </UBadge>
      </div>
    </UPageCard>
  </UPageGrid>
</template>
