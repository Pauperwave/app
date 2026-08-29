<!-- app\components\leagues\LeagueTournamentsProgress.vue -->
<!-- Shared by leagues/list/Card.vue and leagues/single/PresentationCard.vue —
     both rendered the same "completed/total" label + UProgress bar. -->
<script setup lang="ts">
import type { League } from '~/types'

const { league } = defineProps<{ league: League }>()

const { t } = useI18n()

const progress = computed(() => league.tournamentCount
  ? Math.round((league.completedTournamentCount / league.tournamentCount) * 100)
  : 0)
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div class="flex items-center justify-between text-sm text-muted">
      <span>{{ t('league.tournamentsLabel') }}</span>
      <span>{{ t('league.progress', {
        completed: league.completedTournamentCount, total: league.tournamentCount
      }) }}</span>
    </div>
    <UProgress :model-value="progress" size="sm" />
  </div>
</template>
