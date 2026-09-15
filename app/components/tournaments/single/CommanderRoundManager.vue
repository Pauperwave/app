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
import type { TablePlayer } from '~/types'
import type { WinnerChecklistEntry } from '~/components/tournaments/single/pairing/WinnerChecklistCard.vue'

const {
  tournamentUuid, roundNumber, roundCount, autoOpenAdvancePreview = false
} = defineProps<{
  tournamentUuid: string
  roundNumber: number
  /** Total round count for this tournament — "Prossimo Round" ends the
   * tournament instead of creating a new one once past this. */
  roundCount: number
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

const { data: rounds } = useTournamentRoundsQuery(() => tournamentUuid)
const { data: pairings } = useTournamentPairingsQuery(() => tournamentUuid)
const { data: results } = useTournamentRoundResultsQuery(() => tournamentUuid)
const { data: kills } = useTournamentKillsQuery(() => tournamentUuid)
const { data: votes } = useTournamentVotesQuery(() => tournamentUuid)
const { data: registrations } = useTournamentRegistrationsQuery(() => tournamentUuid)
const { data: associatesData } = useAssociatesQuery()
const { liveStandings } = useLiveCommanderStandings(() => tournamentUuid)

const round = computed(() => rounds.value?.find(r => r.roundNumber === roundNumber) ?? null)
const isLastRoundOfTournament = computed(() => roundNumber >= roundCount)
const roundIsCompleted = computed(() => round.value?.status === 'completed')
const tournamentIsEnded = computed(() => isLastRoundOfTournament.value && roundIsCompleted.value)

// player_uuid -> associate uuid / display label, resolved through this
// tournament's own registrations (not a global players table read) — same
// mapping useTournamentRegistrationsQuery already gives every other
// tournament-detail composable.
const associateByPlayerUuid = computed(() => {
  const map = new Map<string, string>()
  for (const registration of registrations.value ?? []) {
    map.set(registration.playerUuid, registration.associateUuid)
  }
  return map
})
const associatesByUuid = computed(() =>
  new Map((associatesData.value ?? []).map(a => [a.uuid, a])))

function labelFor(playerUuid: string): string {
  const associateUuid = associateByPlayerUuid.value.get(playerUuid)
  const associate = associateUuid ? associatesByUuid.value.get(associateUuid) : undefined
  return associate ? `${associate.first_name} ${associate.last_name}` : playerUuid
}
function associateUuidFor(playerUuid: string): string | undefined {
  return associateByPlayerUuid.value.get(playerUuid)
}

const pairingsForRound = computed(() =>
  (pairings.value ?? []).filter(p => p.roundUuid === round.value?.uuid))

function tablePlayersFor(pairing: { playerUuids: string[] }): TablePlayer[] {
  return pairing.playerUuids.map(playerUuid => ({ value: playerUuid, label: labelFor(playerUuid) }))
}

function positionsFor(pairingUuid: string): Map<string, number> {
  const map = new Map<string, number>()
  for (const result of results.value ?? []) {
    if (result.pairingUuid === pairingUuid && result.position !== null) {
      map.set(result.playerUuid, result.position)
    }
  }
  return map
}
function killsFor(pairingUuid: string) {
  return (kills.value ?? []).filter(k => k.pairingUuid === pairingUuid)
}
function votesFor(pairingUuid: string) {
  return (votes.value ?? []).filter(v => v.pairingUuid === pairingUuid)
}
function commanderDeckFor(pairingUuid: string, playerUuid: string) {
  const result = (results.value ?? [])
    .find(r => r.pairingUuid === pairingUuid && r.playerUuid === playerUuid)
  return result?.commanderDeckUuid ?? null
}
function isPairingComplete(pairingUuid: string): boolean {
  const pairing = pairingsForRound.value.find(p => p.uuid === pairingUuid)
  if (!pairing) return false
  return pairing.playerUuids.every(playerUuid => positionsFor(pairingUuid).has(playerUuid))
}
function isPairingDraw(pairingUuid: string): boolean {
  const pos = positionsFor(pairingUuid)
  const pairing = pairingsForRound.value.find(p => p.uuid === pairingUuid)
  if (!pairing || pos.size === 0) return false
  const allFirst = pairing.playerUuids.every(playerUuid => pos.get(playerUuid) === 1)
  const noKills = killsFor(pairingUuid).length === 0
  return allFirst && noKills
}

// ─── Winner checklist ("Vincitori tavoli") ──────────────────────────────────
// One entry per table that already has a real winner (position === 1,
// draws excluded via isPairingDraw — a draw has no actual winner, same
// distinction useCommanderScoring.ts's isDrawTable makes for scoring).
const winners = computed<WinnerChecklistEntry[]>(() =>
  pairingsForRound.value.reduce<WinnerChecklistEntry[]>((entries, pairing) => {
    if (isPairingDraw(pairing.uuid)) return entries
    const pos = positionsFor(pairing.uuid)
    const winnerUuids = pairing.playerUuids.filter(playerUuid => pos.get(playerUuid) === 1)
    if (winnerUuids.length === 0) return entries
    entries.push({
      pairingUuid: pairing.uuid,
      tableNumber: pairing.tableNumber ?? 0,
      players: winnerUuids.map(playerUuid => ({ value: playerUuid, label: labelFor(playerUuid) }))
    })
    return entries
  }, []))

const { checked: winnersChecked, toggle: toggleWinnerChecked }
  = useWinnerChecklist(() => tournamentUuid, () => roundNumber)

// ─── Ranking modal ──────────────────────────────────────────────────────────
const { saveRanking } = useTournamentRoundResultsMutations(() => tournamentUuid)
const scoreModalOpen = ref(false)
const activeScorePairingUuid = ref<string | null>(null)

function openScoreModal(pairingUuid: string) {
  activeScorePairingUuid.value = pairingUuid
  scoreModalOpen.value = true
}
const activeScorePlayers = computed<TablePlayer[]>(() => {
  const pairing = pairingsForRound.value.find(p => p.uuid === activeScorePairingUuid.value)
  return pairing ? tablePlayersFor(pairing) : []
})
async function onScoreConfirm(ranking: { playerUuid: string, position: number }[]) {
  const pairingUuid = activeScorePairingUuid.value
  if (!pairingUuid) return
  try {
    await saveRanking.mutateAsync(
      ranking.map(r => ({ pairingUuid, playerUuid: r.playerUuid, position: r.position }))
    )
    scoreModalOpen.value = false
  } catch { /* toasted by the mutation's own onError */ }
}

// "Patta" — zero kills, everyone tied for 1st (see useCommanderScoring.ts's
// isDrawTable). Only offered on an empty table or to toggle an existing
// draw back off (canToggleDraw in RoundPairingCard.vue).
async function declareDraw(pairingUuid: string) {
  const pairing = pairingsForRound.value.find(p => p.uuid === pairingUuid)
  if (!pairing) return
  try {
    await saveRanking.mutateAsync(
      pairing.playerUuids.map(playerUuid => ({ pairingUuid, playerUuid, position: 1 }))
    )
  } catch { /* toasted by the mutation's own onError */ }
}

// ─── Kill tracker modal ─────────────────────────────────────────────────────
const { recordKill, removeKill } = useTournamentKillsMutations(() => tournamentUuid)
const killModalOpen = ref(false)
const activeKillPairingUuid = ref<string | null>(null)

function openKillModal(pairingUuid: string) {
  activeKillPairingUuid.value = pairingUuid
  killModalOpen.value = true
}
const activeKillPlayers = computed<TablePlayer[]>(() => {
  const pairing = pairingsForRound.value.find(p => p.uuid === activeKillPairingUuid.value)
  return pairing ? tablePlayersFor(pairing) : []
})
const activeKillEvents = computed(() =>
  activeKillPairingUuid.value ? killsFor(activeKillPairingUuid.value) : [])
function onKillConnect(killerUuid: string, killedPlayerUuid: string) {
  if (!activeKillPairingUuid.value) return
  recordKill.mutate({ pairingUuid: activeKillPairingUuid.value, killerUuid, killedPlayerUuid })
}
function onKillRemove(killerUuid: string, killedPlayerUuid: string) {
  const kill = activeKillEvents.value.find(k =>
    k.killerUuid === killerUuid && k.killedPlayerUuid === killedPlayerUuid)
  if (kill) removeKill.mutate(kill.uuid)
}

// ─── Votes modal ────────────────────────────────────────────────────────────
const { castVote } = useTournamentVotesMutations(() => tournamentUuid)
const votesModalOpen = ref(false)
const activeVotes = ref<{ pairingUuid: string, playerUuid: string } | null>(null)

function openVotesModal(pairingUuid: string, playerUuid: string) {
  activeVotes.value = { pairingUuid, playerUuid }
  votesModalOpen.value = true
}
const activeVotesOtherPlayers = computed<TablePlayer[]>(() => {
  if (!activeVotes.value) return []
  const pairing = pairingsForRound.value.find(p => p.uuid === activeVotes.value!.pairingUuid)
  if (!pairing) return []
  return tablePlayersFor(pairing).filter(p => p.value !== activeVotes.value!.playerUuid)
})
const activeVotesExisting = computed(() => {
  if (!activeVotes.value) return []
  return votesFor(activeVotes.value.pairingUuid)
    .filter(v => v.voterUuid === activeVotes.value!.playerUuid)
    .map(v => ({ votedPlayerUuid: v.votedPlayerUuid, voteType: v.voteType }))
})
async function onVotesSubmit(brewVotePlayerUuid: string | null, playVotePlayerUuid: string | null) {
  if (!activeVotes.value) return
  const { pairingUuid, playerUuid } = activeVotes.value
  if (brewVotePlayerUuid) {
    await castVote.mutateAsync({ pairingUuid, voterUuid: playerUuid, votedPlayerUuid: brewVotePlayerUuid, voteType: 'brew' })
  }
  if (playVotePlayerUuid) {
    await castVote.mutateAsync({ pairingUuid, voterUuid: playerUuid, votedPlayerUuid: playVotePlayerUuid, voteType: 'play' })
  }
}
function hasVotesFor(pairingUuid: string, playerUuid: string): boolean {
  return votesFor(pairingUuid).some(v => v.voterUuid === playerUuid)
}

// ─── Commander select modal ─────────────────────────────────────────────────
const { selectCommander } = useCommanderDecksMutations(() => tournamentUuid)
const commanderModalOpen = ref(false)
const activeCommander = ref<{ pairingUuid: string, playerUuid: string } | null>(null)

function openCommanderModal(pairingUuid: string, playerUuid: string) {
  activeCommander.value = { pairingUuid, playerUuid }
  commanderModalOpen.value = true
}
async function onCommanderConfirm(commander1Name: string, commander2Name: string | null) {
  if (!activeCommander.value) return
  const { pairingUuid, playerUuid } = activeCommander.value
  try {
    await selectCommander.mutateAsync({ pairingUuid, playerUuid, commander1Name, commander2Name })
  } catch (err) {
    toast.add({
      title: t('tournament.single.commanderModal.errorTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  }
}

// ─── Advance / turn back round ──────────────────────────────────────────────
const { advanceRound, turnBackRound } = useTournamentRoundsMutations(() => tournamentUuid)
const advancePreviewOpen = ref(false)

// Seed the next round's optimizer with the current live-standings order
// (best rank first) — same "rank drives the seed order" idea as league's
// own pairing optimizer, just resolved through this app's associate
// identity instead of a numeric rank field.
const nextRoundSeedPlayers = computed<TablePlayer[]>(() =>
  liveStandings.value.map(s => ({ value: s.associateUuid, label: s.label })))

const allPairingsComplete = computed(() =>
  pairingsForRound.value.length > 0 && pairingsForRound.value.every(p => isPairingComplete(p.uuid)))

function openAdvancePreview() {
  advancePreviewOpen.value = true
}
async function onAdvanceConfirm(associateOrder: string[]) {
  try {
    await advanceRound.mutateAsync({ currentRoundNumber: roundNumber, associateOrder })
    advancePreviewOpen.value = false
  } catch { /* toasted by the mutation's own onError */ }
}
async function endTournament() {
  try {
    await advanceRound.mutateAsync({ currentRoundNumber: roundNumber })
  } catch { /* toasted by the mutation's own onError */ }
}
async function onTurnBack() {
  try {
    await turnBackRound.mutateAsync(roundNumber)
    emit('turnedBack')
  } catch { /* toasted by the mutation's own onError */ }
}

// See autoOpenAdvancePreview's own comment — index.vue flips this on right
// after deleting round `roundNumber + 1`, asking this (the previous) round
// to reopen its own "next round" preview so the organizer lands straight
// back on the table arrangement they're meant to redo.
watch(() => autoOpenAdvancePreview, (value) => {
  if (!value) return
  advancePreviewOpen.value = true
  emit('advancePreviewAutoOpened')
}, { immediate: true })
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-4">
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <UButton
          :label="t('tournament.single.roundManager.turnBackButton')"
          :icon="ICONS.undo"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="onTurnBack"
        />

        <UButton
          v-if="!isLastRoundOfTournament"
          :label="t('tournament.single.roundManager.advanceButton')"
          :icon="ICONS.chevronRight"
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
          @draw="declareDraw(pairing.uuid)"
        />
      </div>
      <EmptyState v-else :message="t('tournament.single.roundManager.noPairings')" />
    </div>

    <div class="space-y-3">
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
    :players="activeScorePlayers"
    :saved-positions="activeScorePairingUuid ? positionsFor(activeScorePairingUuid) : null"
    :loading="saveRanking.isLoading.value"
    @confirm="onScoreConfirm"
  />

  <TournamentsSinglePairingKillTrackerModal
    v-model:open="killModalOpen"
    :players="activeKillPlayers"
    :kills="activeKillEvents"
    @connect="onKillConnect"
    @remove-kill="onKillRemove"
  />

  <TournamentsSinglePairingVotesModal
    v-model:open="votesModalOpen"
    :other-players="activeVotesOtherPlayers"
    :existing-votes="activeVotesExisting"
    @submit="onVotesSubmit"
  />

  <TournamentsSinglePairingCommanderSelectModal
    v-model:open="commanderModalOpen"
    :player-uuid="activeCommander?.playerUuid ?? ''"
    @confirm="onCommanderConfirm"
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
