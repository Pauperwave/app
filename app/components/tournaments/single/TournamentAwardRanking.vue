<!-- app\components\tournaments\single\TournamentAwardRanking.vue -->
<script setup lang="ts">
import type {
  TournamentAwardKind, TournamentAwardRankingEntry
} from '~/composables/tournaments/prizes/useTournamentAwards'

const { kind, ranking } = defineProps<{
  kind: TournamentAwardKind
  ranking: TournamentAwardRankingEntry[]
}>()

const emit = defineEmits<{
  selectPlayer: [playerUuid: string]
}>()
</script>

<template>
  <ol class="rounded-lg border border-default divide-y divide-default overflow-hidden">
    <li
      v-for="entry in ranking"
      :key="entry.playerUuid"
    >
      <TournamentsSingleTournamentAwardRankingRow
        :kind="kind"
        :entry="entry"
        @select="playerUuid => emit('selectPlayer', playerUuid)"
      />
    </li>
  </ol>
</template>
