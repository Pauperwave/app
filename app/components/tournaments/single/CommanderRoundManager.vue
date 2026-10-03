<!-- app\components\tournaments\single\CommanderRoundManager.vue -->
<!-- Commander's "round in progress" view, ported from league's PairingsCard.vue +
     StandingsCard.vue, replacing the stub RoundManager.vue for Commander tournaments only
     (Draft keeps RoundManager.vue, see index.vue's #round-${i} slot).  Every player identity
     here (pairing seats, kills, votes, commander decks) is the DB's players.uuid, resolved from
     tournament_pairings' columns, not the associate uuid used before a round exists (see
     RoundPairingCard.vue). -->
<script setup lang="ts">
import type { ConfirmedSeating } from '~/composables/tournaments/rounds/useConfirmedSeatings'

const {
  tournamentUuid,
  roundNumber,
  roundCount,
  roundDurationMinutes = 75,
  autoOpenAdvancePreview = false,
  nextRoundSeating = null
} = defineProps<{
  tournamentUuid: string
  roundNumber: number
  /** Total round count for this tournament — "Prossimo Round" ends the
   * tournament instead of creating a new one once past this. */
  roundCount: number
  /** tournaments.round_duration_minutes — falls back to 75 (the same
   *  default the column itself has) for callers that don't pass it. */
  roundDurationMinutes?: number
  /**
   * Set by index.vue right after a "Torna al round precedente" click on round `roundNumber + 1`:
   * turning back round N means "delete round N, then show round N-1's next-round preview again", so
   * this round's manager reopens its own advancePreviewOpen on behalf of the round that just turned
   * back into it.
   */
  autoOpenAdvancePreview?: boolean
  /**
   * Tables approved for round `roundNumber + 1` before it was turned back, reopened in its preview.
   */
  nextRoundSeating?: ConfirmedSeating | null
}>()

const emit = defineEmits<{
  turnedBack: []
  advancePreviewAutoOpened: []
}>()

const { t } = useI18n()
const toast = useToast()
const { isDeveloperView } = useDeveloperView()

// See each composable's file comment for why the split lands here (this component had grown past
// 790 lines mixing all four concerns)
const roundData = useCommanderRoundData({
  tournamentUuid: () => tournamentUuid, roundNumber, roundCount
})
const modals = useCommanderRoundModals({ tournamentUuid: () => tournamentUuid, roundData })
const submitHandlers = useCommanderRoundSubmitHandlers({
  tournamentUuid: () => tournamentUuid, roundData, modals
})
const lifecycle = useCommanderRoundLifecycle({
  tournamentUuid: () => tournamentUuid,
  roundNumber,
  roundData,
  autoOpenAdvancePreview: () => autoOpenAdvancePreview,
  onTurnedBack: () => emit('turnedBack'),
  onAdvancePreviewAutoOpened: () => emit('advancePreviewAutoOpened')
})

const {
  isLastRoundOfTournament, turnBackButtonLabel, tournamentIsEnded,
  labelFor, associateUuidFor, pairingsForRound, tablePlayersFor,
  positionsFor, killsFor, commanderDeckFor, isPairingComplete, isPairingDraw,
  hasRankingFor, hasKillsFor, noKillsFor, hasCommanderFor, hasVotesFor, winners, liveStandings,
  dropByPlayerUuid
} = roundData

// Only the round in progress can change: once the next round exists or the tournament ended,
// this one is view only (the server refuses writes too, server/utils/tournaments/editLocks.ts).
const roundLocked = computed(() => roundData.round.value?.status !== 'in_progress')

const {
  rulesetPoints, scoreModalOpen, activeScorePairingUuid, openScoreModal, activeScorePlayers,
  activeScoreTableNumber,
  scoresModalOpen, openScoresModal, activeScoresTableNumber, activeScoresPlayers,
  activeScoresTableResults, killModalOpen, openKillModal, activeKillPlayers, activeKillEvents,
  activeKillNoKills,
  votesModalOpen, activeVotes, openVotesModal, activeVotesSelectedPlayer, activeVotesOtherPlayers,
  activeVotesExisting, commanderNameForVotes, commanderModalOpen, activeCommander,
  openCommanderModal, activeCommanderNameParts, activeCommanderTablePlayerUuids,
  activeCommanderCurrent, requestResetTable, requestQuickFill, requestQuickFillAll, requestDraw,
  isConfirmDialogOpen, confirmDialogTableNumber, confirmDialogCopy
} = modals

const {
  saveRanking, onScoreConfirm, onKillConnect, onKillRemove, onNoKillsSet, onVotesSubmit,
  onCommanderConfirm,
  onConfirmDialogConfirm, onToggleDrop, onCommanderClear
} = submitHandlers

const {
  advanceRound, turnBackRound, reopenMutation, advancePreviewOpen, nextRoundSeedPlayers,
  allPairingsComplete, canFormNextRoundTables, openAdvancePreview, onAdvanceConfirm,
  turnBackConfirmOpen, endConfirmOpen, requestTurnBack, requestEndTournament, endTournament,
  onTurnBack, reopenTournament
} = lifecycle

// Ending the tournament (last round) seats nobody, so only a real "next round" needs valid tables.
const cannotFormNextRound = computed(() =>
  !isLastRoundOfTournament.value && !canFormNextRoundTables.value)

const { checked: winnersChecked, toggle: toggleWinnerChecked }
  = useWinnerChecklist(() => tournamentUuid, () => roundNumber)

// ─── Round timer ──────────────────────────────────────────────────────────── TODO: still no real
// sync with the Telegram app; the duration itself comes from tournaments.round_duration_minutes
// (roundDurationMinutes prop)
function handleTimerExpired() {
  toast.add({
    title: t('tournament.single.roundManager.timerExpiredTitle'),
    description: t('tournament.single.roundManager.timerExpiredDescription', { round: roundNumber }),
    color: 'warning',
    icon: ICONS.timerOff
  })
}

// Resolved once per pairing, reused by TablesFullscreenView.vue below — it's
// pure display, so it receives already-resolved players (same tablePlayersFor
// output every table card gets), not a name-lookup function.
const tablePlayersByPairingUuid = computed(() =>
  new Map(pairingsForRound.value.map(pairing => [pairing.uuid, tablePlayersFor(pairing)])))

// ─── "Tavoli" wrapper card fullscreen ───────────────────────────────────────
// Same browser Fullscreen API pattern as StandingsSidebar.vue's own toggle —
// takes over the whole screen instead of sharing space with the sidebar.
const tablesRef = useTemplateRef<HTMLDivElement>('tablesRef')
const {
  isFullscreen: isTablesFullscreen, toggle: toggleTablesFullscreen
} = useFullscreen(tablesRef)

// "f-t" ("fullscreen tables"): the state lives here, with the "own the state, call defineShortcuts
// from that component" pattern of `b`/`h` in docs/architecture/shortcuts.md. RoundTimer.vue
// registers its own "f-c" sibling for its fullscreen state
defineShortcuts({
  'f-t': toggleTablesFullscreen
})

// "f t" hint next to the fullscreen button, shown from the moment "f" is
// pressed — same mechanism/UX as default.vue's own "g" nav hint.
const showFHint = useChordHintKey('f')
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
    <div class="space-y-3">
      <!-- A closed round has nothing left to advance or turn back: only the current one does, and
           an ended tournament only offers to be reopened. -->
      <TournamentsSinglePairingRoundNavButtons
        v-if="!roundLocked || tournamentIsEnded"
        :ended="tournamentIsEnded"
        :reopen-loading="reopenMutation.isLoading.value"
        :turn-back-label="turnBackButtonLabel"
        :is-last-round="isLastRoundOfTournament"
        :advance-disabled="!allPairingsComplete || cannotFormNextRound"
        :advance-disabled-tooltip="allPairingsComplete && cannotFormNextRound
          ? t('tournament.single.roundManager.advanceNotEnoughPlayersTooltip')
          : undefined"
        :end-loading="advanceRound.isLoading.value"
        @turn-back="requestTurnBack"
        @advance="openAdvancePreview"
        @end-tournament="requestEndTournament"
        @reopen="reopenTournament"
      />

      <TournamentsSinglePairingRoundTimer
        :key="roundNumber"
        :tournament-uuid="tournamentUuid"
        :duration-minutes="roundDurationMinutes"
        :round="roundNumber"
        @expired="handleTimerExpired"
      />

      <div ref="tablesRef">
        <TournamentsSinglePairingTablesFullscreenView
          v-if="isTablesFullscreen"
          :pairings-for-round="pairingsForRound"
          :players-by-pairing-uuid="tablePlayersByPairingUuid"
          @exit="toggleTablesFullscreen"
        />

        <UCard v-else variant="outline">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon :name="ICONS.grid" class="size-5 text-primary" />
              <h2 class="text-lg font-semibold">
                {{ t('tournament.single.roundManager.tablesHeading') }}
              </h2>
              <UTooltip
                v-if="isDeveloperView"
                :text="t('tournament.single.roundManager.quickFillAllTooltip')"
              >
                <UButton
                  size="xs"
                  variant="outline"
                  color="warning"
                  :icon="ICONS.quickAction"
                  :aria-label="t('tournament.single.roundManager.quickFillAllTooltip')"
                  @click="requestQuickFillAll"
                />
              </UTooltip>
              <UTooltip :text="t('tournament.single.roundManager.fullscreenTooltip')">
                <UButton
                  :icon="ICONS.expand"
                  color="neutral"
                  variant="ghost"
                  :aria-label="t('tournament.single.roundManager.fullscreenTooltip')"
                  @click="toggleTablesFullscreen"
                />
              </UTooltip>

              <ChordHint :keys="['f', 't']" :show="showFHint" />
            </div>
          </template>

          <div v-if="pairingsForRound.length" class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TournamentsSinglePairingRoundPairingCard
              v-for="pairing in pairingsForRound"
              :key="pairing.uuid"
              :table-number="pairing.tableNumber ?? 0"
              :players="tablePlayersFor(pairing)"
              :positions="positionsFor(pairing.uuid)"
              :has-kills="killsFor(pairing.uuid).length > 0"
              :no-kills="noKillsFor(pairing.uuid)"
              :has-votes="(playerUuid: string) => hasVotesFor(pairing.uuid, playerUuid)"
              :has-commander="(playerUuid: string) => !!commanderDeckFor(pairing.uuid, playerUuid)"
              :is-complete="isPairingComplete(pairing.uuid)"
              :is-draw="isPairingDraw(pairing.uuid)"
              :associate-uuid-for="associateUuidFor"
              :dropped-for="(playerUuid: string) => dropByPlayerUuid.get(playerUuid) ?? null"
              :readonly="roundLocked"
              @open-score-modal="openScoreModal(pairing.uuid)"
              @open-kill-modal="openKillModal(pairing.uuid)"
              @open-votes-modal="(playerUuid: string) => openVotesModal(pairing.uuid, playerUuid)"
              @open-commander-modal="
                (playerUuid: string) => openCommanderModal(pairing.uuid, playerUuid)
              "
              @open-scores-modal="openScoresModal(pairing.uuid)"
              @reset-table="requestResetTable(pairing.uuid)"
              @quick-fill="requestQuickFill(pairing.uuid)"
              @draw="requestDraw(pairing.uuid)"
              @toggle-drop="onToggleDrop"
            />
          </div>
          <EmptyState v-else :message="t('tournament.single.roundManager.noPairings')" />
        </UCard>
      </div>
    </div>

    <div class="space-y-3">
      <TournamentsSinglePairingRoundStatusCard
        :pairings-for-round="pairingsForRound"
        :label-for="labelFor"
        :associate-uuid-for="associateUuidFor"
        :has-ranking="hasRankingFor"
        :has-kills="hasKillsFor"
        :has-commander="hasCommanderFor"
        :has-votes="hasVotesFor"
        @open-score-modal="openScoreModal"
        @open-kill-modal="openKillModal"
        @open-commander-modal="openCommanderModal"
        @open-votes-modal="openVotesModal"
      />

      <TournamentsSinglePairingWinnerChecklistCard
        :winners="winners"
        :checked="winnersChecked"
        @toggle="toggleWinnerChecked"
      />

      <TournamentsSinglePairingStandingsSidebar
        :standings="liveStandings"
        :is-ended="tournamentIsEnded"
      />
    </div>
  </div>

  <TournamentsSinglePairingTableScoreGridModal
    v-model:open="scoreModalOpen"
    :table-number="activeScoreTableNumber"
    :players="activeScorePlayers"
    :saved-positions="activeScorePairingUuid ? positionsFor(activeScorePairingUuid) : null"
    :loading="saveRanking.isLoading.value"
    @confirm="onScoreConfirm"
  />

  <TournamentsSinglePairingTableScoresModal
    v-model:open="scoresModalOpen"
    :round-number="roundNumber"
    :table-number="activeScoresTableNumber"
    :players="activeScoresPlayers"
    :table-results="activeScoresTableResults"
    :ruleset="rulesetPoints"
  />

  <ConfirmModal
    v-if="confirmDialogCopy"
    v-model:open="isConfirmDialogOpen"
    :title="confirmDialogCopy.title"
    :description="confirmDialogTableNumber
      ? `${confirmDialogCopy.description} ${t('tournament.single.roundManager.tableHeading', {
        n: confirmDialogTableNumber
      })}`
      : confirmDialogCopy.description"
    :warning="confirmDialogCopy.warning"
    :confirm-label="confirmDialogCopy.confirmLabel"
    :confirm-icon="confirmDialogCopy.confirmIcon"
    :confirm-color="confirmDialogCopy.confirmColor"
    @confirm="onConfirmDialogConfirm"
  />

  <TournamentsSinglePairingKillTrackerModal
    v-model:open="killModalOpen"
    :players="activeKillPlayers"
    :kills="activeKillEvents"
    :no-kills="activeKillNoKills"
    @connect="onKillConnect"
    @remove-kill="onKillRemove"
    @set-no-kills="onNoKillsSet"
  />

  <TournamentsSinglePairingTournamentVotesModal
    v-model:open="votesModalOpen"
    :selected-player="activeVotesSelectedPlayer"
    :other-players="activeVotesOtherPlayers"
    :existing-votes="activeVotesExisting"
    :ruleset="rulesetPoints"
    :commander-name-for="commanderNameForVotes"
    @submit="onVotesSubmit"
    @assign-commander="(playerUuid) => activeVotes
      && openCommanderModal(activeVotes.pairingUuid, playerUuid)"
  />

  <TournamentsSinglePairingTournamentCommanderModal
    v-model:open="commanderModalOpen"
    :player-uuid="activeCommander?.playerUuid ?? ''"
    :first-name="activeCommanderNameParts.firstName"
    :surname="activeCommanderNameParts.surname"
    :commander1="activeCommanderCurrent.commander1"
    :commander2="activeCommanderCurrent.commander2"
    :table-player-uuids="activeCommanderTablePlayerUuids"
    @submit="onCommanderConfirm"
    @clear="onCommanderClear"
  />

  <TournamentsSinglePairingRoundLifecycleConfirms
    v-model:turn-back-open="turnBackConfirmOpen"
    v-model:end-open="endConfirmOpen"
    :round-number="roundNumber"
    :turn-back-loading="turnBackRound.isLoading.value"
    :end-loading="advanceRound.isLoading.value"
    @turn-back="onTurnBack"
    @end="endTournament"
  />

  <TournamentsSinglePairingTablePreviewModal
    v-model:open="advancePreviewOpen"
    :players="nextRoundSeedPlayers"
    :tournament-uuid="tournamentUuid"
    :current-round="roundNumber + 1"
    :confirmed-seating="nextRoundSeating"
    :loading="advanceRound.isLoading.value"
    @confirm="onAdvanceConfirm"
  />
</template>
