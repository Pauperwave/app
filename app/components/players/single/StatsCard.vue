<!-- app\components\players\single\StatsCard.vue -->
<!-- The "Statistiche" block of a player: tournaments, matches and wins, plus how often they were
     the killer / the victim of a kill and how often they were voted master brewer / player. Shaped
     like league's player profile header, on the shared StatCardsGrid. -->
<script setup lang="ts">
import type { PlayerStats } from '~/composables/players/usePlayerStatsQuery'

const { stats, loading } = defineProps<{
  stats: PlayerStats | undefined
  loading: boolean
}>()

const { t } = useI18n()

const items = computed(() => [
  { label: t('player.stats.tournaments'), value: stats?.tournamentsPlayed ?? 0 },
  { label: t('player.stats.matches'), value: stats?.matchesPlayed ?? 0 },
  { label: t('player.stats.wins'), value: stats?.wins ?? 0 },
  { label: t('player.stats.averageKills'), value: stats?.averageKills ?? 0 },
  { label: t('player.stats.killer'), value: stats?.kills ?? 0 },
  { label: t('player.stats.victim'), value: stats?.timesKilled ?? 0 },
  { label: t('player.stats.masterBrewer'), value: stats?.brewVotesReceived ?? 0 },
  { label: t('player.stats.bestPlayer'), value: stats?.playVotesReceived ?? 0 }
])
</script>

<template>
  <section class="flex flex-col gap-3">
    <h2 class="font-semibold flex items-center gap-2">
      <UIcon :name="ICONS.chartColumn" class="size-5 shrink-0 text-primary" />
      {{ t('player.detail.sections.stats') }}
    </h2>

    <div
      v-if="loading"
      class="grid grid-cols-2 sm:grid-cols-4 gap-3"
    >
      <USkeleton
        v-for="n in 8"
        :key="n"
        class="h-20"
      />
    </div>
    <StatCardsGrid v-else :stats="items" />
  </section>
</template>
