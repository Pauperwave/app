<!-- app\components\tournaments\single\pairing\CommanderPlayerReportModal.vue -->
<!-- One player's "pagella": a card per round (ReportRoundCard.vue) and the grand total. -->
<script setup lang="ts">
import type { LiveCommanderStanding } from '~/utils/tournaments/liveCommanderStandings'

const { tournamentUuid, standings, player } = defineProps<{
  tournamentUuid: string
  standings: LiveCommanderStanding[]
  player: LiveCommanderStanding | null
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  selectPlayer: [playerUuid: string]
}>()

const { t } = useI18n()

const { roundsWithDeck } = useCommanderPlayerReport(() => tournamentUuid, () => player)

const standingByPlayerUuid = computed(() =>
  new Map(standings.map(standing => [standing.playerUuid, standing])))
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #title>
      <div class="flex items-center gap-2">
        <span>{{ t('tournament.single.roundManager.reportTitle') }}</span>
        <AssociateTag
          v-if="player"
          :name="player.firstName"
          :surname="player.surname"
          :associate-uuid="player.associateUuid"
          size="md"
        />
      </div>
    </template>

    <template #body>
      <div v-if="roundsWithDeck.length > 0" class="space-y-3">
        <TournamentsSinglePairingReportRoundCard
          v-for="reportRound in roundsWithDeck"
          :key="reportRound.roundNumber"
          :report-round="reportRound"
          :people-by-player-uuid="standingByPlayerUuid"
          @select-player="playerUuid => emit('selectPlayer', playerUuid)"
        />

        <div class="flex items-center justify-between rounded-lg bg-elevated px-4 py-3 font-bold">
          <span>{{ t('tournament.single.roundManager.reportTotal') }}</span>
          <span class="font-mono text-primary">
            {{ t('tournament.single.roundManager.reportPoints', { points: player?.score ?? 0 }) }}
          </span>
        </div>
      </div>

      <EmptyState v-else :message="t('tournament.single.roundManager.reportEmpty')" />
    </template>
  </UModal>
</template>
