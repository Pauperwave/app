<!-- app\components\tournaments\single\CommanderRoundManager.vue -->
<!--
  Commander's "round in progress" view — ported from
  MagicTheGathering/league's PairingsCard.vue + StandingsCard.vue (user
  request, 2026-09-15/16: copy the round-view layout as-is), replacing the
  stub RoundManager.vue for Commander tournaments only (Draft keeps
  rendering RoundManager.vue unchanged, out of scope for this pass — see
  index.vue's own #round-${i} slot).

  Every player identity here (pairing seats, kills, votes, commander decks)
  is the DB's players.uuid, resolved from tournament_pairings' own columns —
  not the associate uuid used before a round exists (see
  RoundPairingCard.vue's own comment on this split).
-->
<script setup lang="ts">
const {
  tournamentUuid, roundNumber, roundCount, roundDurationMinutes = 75, autoOpenAdvancePreview = false
} = defineProps<{
  tournamentUuid: string
  roundNumber: number
  /** Total round count for this tournament — "Prossimo Round" ends the
   * tournament instead of creating a new one once past this. */
  roundCount: number
  /** tournaments.round_duration_minutes — falls back to 75 (the same
   *  default the column itself has) for callers that don't pass it. */
  roundDurationMinutes?: number
  /** Set by index.vue right after a "Torna al round precedente" click on
   * round `roundNumber + 1` — turning back round N means "delete round N,
   * then show round N-1's own next-round preview again" (user request,
   * 2026-09-18), so this round's manager needs to reopen its own
   * advancePreviewOpen on behalf of the round that just turned back into it. */
  autoOpenAdvancePreview?: boolean
}>()

const emit = defineEmits<{
  turnedBack: []
  advancePreviewAutoOpened: []
}>()

const { t } = useI18n()
const toast = useToast()
const { isDeveloperView } = useDeveloperView()

// See each composable's own file comment for why the split lands here
// (2026-09-18 refactor, once this component had grown past 790 lines mixing
// all four of these concerns together).
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
  labelFor, associateUuidFor, pairingsForRound, tablePlayersFor, positionsFor, killsFor,
  commanderDeckFor, isPairingComplete, isPairingDraw, hasRankingFor, hasKillsFor,
  hasCommanderFor, hasVotesFor, winners, liveStandings
} = roundData

const {
  rulesetPoints, scoreModalOpen, activeScorePairingUuid, openScoreModal, activeScorePlayers,
  activeScoreTableNumber,
  scoresModalOpen, openScoresModal, activeScoresTableNumber, activeScoresPlayers,
  activeScoresTableResults, killModalOpen, openKillModal, activeKillPlayers, activeKillEvents,
  votesModalOpen, activeVotes, openVotesModal, activeVotesSelectedPlayer, activeVotesOtherPlayers,
  activeVotesExisting, commanderNameForVotes, commanderModalOpen, activeCommander,
  openCommanderModal, activeCommanderPlayerName, activeCommanderTablePlayerUuids,
  activeCommanderCurrent, requestResetTable, requestQuickFill, requestQuickFillAll, requestDraw,
  isConfirmDialogOpen, confirmDialogTableNumber, confirmDialogCopy
} = modals

const {
  saveRanking, onScoreConfirm, onKillConnect, onKillRemove, onVotesSubmit, onCommanderConfirm,
  onConfirmDialogConfirm
} = submitHandlers

const {
  advanceRound, advancePreviewOpen, nextRoundSeedPlayers, allPairingsComplete,
  openAdvancePreview, onAdvanceConfirm, endTournament, onTurnBack
} = lifecycle

const { checked: winnersChecked, toggle: toggleWinnerChecked }
  = useWinnerChecklist(() => tournamentUuid, () => roundNumber)

// ─── Round timer ────────────────────────────────────────────────────────────
// TODO: still no real sync with the Telegram app (user request) — the
// duration itself now comes from tournaments.round_duration_minutes
// (roundDurationMinutes prop) instead of a hardcoded default.
function handleTimerExpired() {
  toast.add({
    title: t('tournament.single.roundManager.timerExpiredTitle'),
    description: t('tournament.single.roundManager.timerExpiredDescription', { round: roundNumber }),
    color: 'warning',
    icon: ICONS.timerOff
  })
}

// ─── "Tavoli" wrapper card fullscreen ───────────────────────────────────────
// Same browser Fullscreen API pattern as StandingsSidebar.vue's own toggle —
// takes over the whole screen instead of sharing space with the sidebar.
const tablesRef = useTemplateRef<HTMLDivElement>('tablesRef')
const {
  isFullscreen: isTablesFullscreen, toggle: toggleTablesFullscreen
} = useFullscreen(tablesRef)

// "f-t" ("fullscreen tables") — state lives here, same "own the state, call
// defineShortcuts from that component" pattern as `b`/`h` in
// docs/architecture/shortcuts.md. RoundTimer.vue registers its own "f-c"
// sibling the same way, for its own fullscreen state.
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
      <div class="flex items-center justify-between">
        <UButton
          :label="turnBackButtonLabel"
          :icon="ICONS.undo"
          color="error"
          variant="outline"
          @click="onTurnBack"
        />

        <UButton
          v-if="!isLastRoundOfTournament"
          :label="t('tournament.single.roundManager.advanceButton')"
          :icon="ICONS.forward"
          trailing
          :disabled="!allPairingsComplete"
          @click="openAdvancePreview"
        />
        <UButton
          v-else
          :label="t('tournament.single.roundManager.endTournamentButton')"
          :icon="ICONS.standings"
          color="primary"
          :disabled="!allPairingsComplete"
          :loading="advanceRound.isLoading.value"
          @click="endTournament"
        />
      </div>

      <TournamentsSinglePairingRoundTimer
        :key="roundNumber"
        :duration-minutes="roundDurationMinutes"
        :round="roundNumber"
        @expired="handleTimerExpired"
      />

      <div ref="tablesRef">
        <TournamentsSinglePairingTablesFullscreenView
          v-if="isTablesFullscreen"
          :pairings-for-round="pairingsForRound"
          :label-for="labelFor"
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
              :has-votes="(playerUuid: string) => hasVotesFor(pairing.uuid, playerUuid)"
              :has-commander="(playerUuid: string) => !!commanderDeckFor(pairing.uuid, playerUuid)"
              :is-complete="isPairingComplete(pairing.uuid)"
              :is-draw="isPairingDraw(pairing.uuid)"
              :associate-uuid-for="associateUuidFor"
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
    @connect="onKillConnect"
    @remove-kill="onKillRemove"
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
    :player-name="activeCommanderPlayerName"
    :commander1="activeCommanderCurrent.commander1"
    :commander2="activeCommanderCurrent.commander2"
    :table-player-uuids="activeCommanderTablePlayerUuids"
    @submit="onCommanderConfirm"
  />

  <TournamentsSinglePairingTablePreviewModal
    v-model:open="advancePreviewOpen"
    :players="nextRoundSeedPlayers"
    :tournament-uuid="tournamentUuid"
    :current-round="roundNumber + 1"
    :loading="advanceRound.isLoading.value"
    @confirm="onAdvanceConfirm"
  />
</template>
