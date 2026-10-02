<!-- app\components\tournaments\single\Leaderboard.vue -->
<script setup lang="ts">
import type { LiveCommanderStanding } from '~/composables/tournaments/pairing/useLiveCommanderStandings'
import type { LiveSwissStanding } from '~/composables/tournaments/pairing/useLiveSwissStandings'

// Only Commander and 1v1 Swiss tournaments have a real final standing so far.
const { tournamentUuid, commanderStandings, swissStandings } = defineProps<{
  tournamentUuid: string
  commanderStandings?: LiveCommanderStanding[]
  swissStandings?: LiveSwissStanding[]
}>()
</script>

<template>
  <div class="space-y-3">
    <h2 class="flex items-center gap-2 text-lg font-semibold text-highlighted">
      <UIcon :name="ICONS.standings" class="size-5 text-primary" />
      {{ $t('tournament.single.leaderboardTitle') }}
    </h2>
    <TournamentsSinglePairingCommanderStandingsTable
      v-if="commanderStandings"
      :tournament-uuid="tournamentUuid"
      :standings="commanderStandings"
    />
    <TournamentsSinglePairingSwissStandingsTable
      v-else-if="swissStandings"
      :standings="swissStandings"
    />
  </div>
</template>
