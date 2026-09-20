<!-- app\components\tournaments\single\Leaderboard.vue -->
<script setup lang="ts">
import type { LiveSwissStanding } from '~/composables/tournaments/pairing/useLiveSwissStandings'

// Only 1v1 Swiss tournaments have a real final standing so far.
const { swissStandings } = defineProps<{
  swissStandings?: LiveSwissStanding[]
}>()
</script>

<template>
  <div class="space-y-3">
    <h1>{{ $t('tournament.single.leaderboardTitle') }}</h1>
    <TournamentsSinglePairingSwissStandingsTable
      v-if="swissStandings"
      :standings="swissStandings"
    />
  </div>
</template>
