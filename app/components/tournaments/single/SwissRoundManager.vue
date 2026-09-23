<!-- app\components\tournaments\single\SwissRoundManager.vue -->
<!--
  1v1 Swiss-format round view — Phases 1-3 of
  docs/plans/2026-09-15-swiss-pairing-draft-1v1-plan.md: pairings (table N:
  player A vs player B), best-of-3 match-result entry, live standings with
  tiebreaks, standings-based pairing of the next round and advance/turn-back.
  Replaces the stub RoundManager.vue for Draft (after its pod stage) and every plain-Swiss
  format — see index.vue's own #round-${i} slot and is1v1Format.

  Script split into useSwissRoundData.ts/useSwissRoundSubmitHandlers.ts/
  useSwissRoundLifecycle.ts (2026-09-24), same three-way split as
  CommanderRoundManager.vue's own useCommanderRound* composables — see each
  one's own file comment for why the split lands where it does. Only the
  search/view-mode UI state and the search-filtered match-list building
  stay here, since they mix roundData with this component's own local state.
-->
<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import type { SwissMatchRow } from '~/types'

const {
  tournamentUuid,
  roundNumber,
  roundCount,
  roundDurationMinutes = 75,
  autoOpenAdvancePreview = false
} = defineProps<{
  tournamentUuid: string
  roundNumber: number
  roundCount: number
  // Same tournaments.round_duration_minutes value CommanderRoundManager.vue gets.
  roundDurationMinutes?: number
  // See CommanderRoundManager.vue's own comment on this prop (same
  // "turning back round N reopens round N-1's own next-round preview"
  // mechanism, user request 2026-09-18).
  autoOpenAdvancePreview?: boolean
}>()

const emit = defineEmits<{
  turnedBack: []
  advancePreviewAutoOpened: []
}>()

const { t } = useI18n()
const toast = useToast()

const roundData = useSwissRoundData({
  tournamentUuid: () => tournamentUuid, roundNumber, roundCount
})
const submitHandlers = useSwissRoundSubmitHandlers({
  tournamentUuid: () => tournamentUuid, roundData
})
const lifecycle = useSwissRoundLifecycle({
  tournamentUuid: () => tournamentUuid,
  roundNumber,
  roundData,
  autoOpenAdvancePreview: () => autoOpenAdvancePreview,
  onTurnedBack: () => emit('turnedBack'),
  onAdvancePreviewAutoOpened: () => emit('advancePreviewAutoOpened')
})

const {
  isLastRoundOfTournament, tournamentIsEnded, pairingsForRound,
  matchResultByPairingUuid, telegramInfoFor,
  matchPlayersFor, pendingPlayerUuids, liveStandings
} = roundData

const { onScoreSelect, onScoreClear, onToggleDrop } = submitHandlers

const {
  advanceRoundSwiss, advancePreviewOpen, nextRoundSeedPlayers, allResultsEntered,
  openAdvancePreview, onAdvanceConfirm, endTournament, onTurnBack
} = lifecycle

// ─── Round timer ────────────────────────────────────────────────────────────
function handleTimerExpired() {
  toast.add({
    title: t('tournament.single.roundManager.timerExpiredTitle'),
    description: t('tournament.single.roundManager.timerExpiredDescription', { round: roundNumber }),
    color: 'warning',
    icon: ICONS.timerOff
  })
}

// ─── Search & view mode ─────────────────────────────────────────────────────
const search = ref('')
const viewMode = ref<'cards' | 'table'>('cards')
const viewModeItems = computed<TabsItem[]>(() => [
  { label: t('tournament.single.roundManager.matchViewCards'), value: 'cards', icon: ICONS.grid },
  { label: t('tournament.single.roundManager.matchViewTable'), value: 'table', icon: ICONS.table }
])

// Only the players matching the search stay; a pairing with none left drops out.
const matchTables = computed(() => pairingsForRound.value.flatMap((pairing) => {
  const players = matchPlayersFor(pairing).filter(player =>
    matchesRoundStatusSearch(`${player.name} ${player.surname ?? ''}`, search.value))
  return players.length
    ? [{
      pairing,
      players,
      isBye: pairing.playerUuids.length === 1,
      telegramInfo: telegramInfoFor(matchResultByPairingUuid.value.get(pairing.uuid))
    }]
    : []
}))

const matchRows = computed<SwissMatchRow[]>(() =>
  matchTables.value.flatMap(({
    pairing, players, isBye, telegramInfo
  }) =>
    players.map(player => ({
      pairingUuid: pairing.uuid,
      tableNumber: pairing.tableNumber ?? 0,
      player,
      current: matchResultByPairingUuid.value.get(pairing.uuid) ?? null,
      telegramInfo,
      isBye
    }))))
</script>

<template>
  <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] gap-4">
    <div class="space-y-3">
      <TournamentsSinglePairingRoundNavButtons
        :turn-back-label="t('tournament.single.roundManager.turnBackButton')"
        :is-last-round="isLastRoundOfTournament"
        :advance-disabled="!allResultsEntered"
        :end-loading="advanceRoundSwiss.isLoading.value"
        @turn-back="onTurnBack"
        @advance="openAdvancePreview"
        @end-tournament="endTournament"
      />

      <TournamentsSinglePairingRoundTimer
        :key="roundNumber"
        :duration-minutes="roundDurationMinutes"
        :round="roundNumber"
        @expired="handleTimerExpired"
      />

      <template v-if="pairingsForRound.length">
        <div class="flex items-center justify-between gap-3">
          <SearchInput
            v-model="search"
            :placeholder="t('tournament.single.roundManager.matchSearchPlaceholder')"
            class="w-64"
          />
          <ViewModeTabs v-model="viewMode" :items="viewModeItems" />
        </div>

        <EmptyState
          v-if="!matchTables.length"
          :message="t('tournament.single.roundManager.matchNoSearchResults')"
        />
        <div
          v-else-if="viewMode === 'cards'"
          class="grid grid-cols-[repeat(auto-fill,minmax(26rem,1fr))] gap-3"
        >
          <TournamentsSinglePairingSwissMatchCard
            v-for="{ pairing, players, isBye, telegramInfo } in matchTables"
            :key="pairing.uuid"
            :table-number="pairing.tableNumber ?? 0"
            :players="players"
            :is-bye="isBye"
            :current="matchResultByPairingUuid.get(pairing.uuid)"
            :telegram-info="telegramInfo"
            :search="search"
            @select="score => onScoreSelect(pairing.uuid, score)"
            @clear="onScoreClear(pairing.uuid)"
            @toggle-drop="onToggleDrop"
          />
        </div>
        <TournamentsSinglePairingSwissMatchTable
          v-else
          :rows="matchRows"
          :search="search"
          @select="onScoreSelect"
          @clear="onScoreClear"
          @toggle-drop="onToggleDrop"
        />
      </template>
      <EmptyState v-else :message="t('tournament.single.roundManager.noPairings')" />
    </div>

    <UCard
      :ui="{ header: 'p-2 sm:px-3 font-semibold', body: 'p-2 sm:p-3' }"
      class="self-start"
    >
      <template #header>
        <div class="flex items-center justify-between gap-2">
          <span>
            {{ tournamentIsEnded
              ? t('tournament.single.roundManager.standingsFinal')
              : t('tournament.single.roundManager.standingsPartial') }}
          </span>
          <span
            v-if="pendingPlayerUuids.length > 0"
            class="flex items-center gap-1.5 text-xs font-normal text-muted"
          >
            <span class="size-3 rounded-sm border border-warning/40 bg-warning/10" />
            {{ t('tournament.single.roundManager.standingsPendingLegend') }}
          </span>
        </div>
      </template>
      <TournamentsSinglePairingSwissStandingsTable
        :standings="liveStandings"
        :pending-player-uuids="pendingPlayerUuids"
      />
    </UCard>
  </div>

  <TournamentsSinglePairingSwissTablePreviewModal
    v-model:open="advancePreviewOpen"
    :players="nextRoundSeedPlayers"
    :loading="advanceRoundSwiss.isLoading.value"
    @confirm="onAdvanceConfirm"
  />
</template>
