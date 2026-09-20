<!-- app\components\tournaments\single\SwissRoundManager.vue -->
<!--
  1v1 Swiss-format round view — Phases 1-3 of
  docs/plans/2026-09-15-swiss-pairing-draft-1v1-plan.md: pairings (table N:
  player A vs player B), best-of-3 match-result entry, live standings with
  tiebreaks, standings-based pairing of the next round and advance/turn-back.
  Replaces the stub RoundManager.vue for Draft (after its pod stage) and every plain-Swiss
  format — see index.vue's own #round-${i} slot and is1v1Format.
-->
<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import type {
  MatchScore, SwissMatchPerson, SwissMatchPlayer, SwissMatchRow, TablePlayer
} from '~/types'

const {
  tournamentUuid, roundNumber, roundCount, roundDurationMinutes = 75, autoOpenAdvancePreview = false
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

const { data: rounds } = useTournamentRoundsQuery(() => tournamentUuid)
const { data: pairings } = useTournamentPairingsQuery(() => tournamentUuid)
const { data: matchResults } = useTournamentMatchResultsQuery(() => tournamentUuid)
const { data: registrations } = useTournamentRegistrationsQuery(() => tournamentUuid)
const {
  liveStandings, playedPairs, byePlayerUuids, dropByPlayerUuid
}
  = useLiveSwissStandings(() => tournamentUuid)
const { data: associatesData } = useAssociatesQuery()

const round = computed(() => rounds.value?.find(r => r.roundNumber === roundNumber) ?? null)
const isLastRoundOfTournament = computed(() => roundNumber >= roundCount)

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

function personFor(playerUuid: string): SwissMatchPerson {
  const associateUuid = associateUuidFor(playerUuid)
  const associate = associateUuid ? associatesByUuid.value.get(associateUuid) : undefined
  return {
    associateUuid,
    name: associate?.first_name ?? labelFor(playerUuid),
    surname: associate?.last_name
  }
}

function matchPlayersFor(pairing: { playerUuids: string[] }): SwissMatchPlayer[] {
  return pairing.playerUuids.map((playerUuid, index) => {
    const opponentUuid = pairing.playerUuids[index === 0 ? 1 : 0]
    return {
      ...personFor(playerUuid),
      seat: index === 0 ? 0 : 1,
      playerUuid,
      opponent: opponentUuid ? personFor(opponentUuid) : { name: '' },
      dropped: dropByPlayerUuid.value.get(playerUuid) ?? null
    }
  })
}

// ─── Match results ──────────────────────────────────────────────────────────
const { saveMatchResult, deleteMatchResult }
  = useTournamentMatchResultsMutations(() => tournamentUuid)

const matchResultByPairingUuid = computed(() =>
  new Map((matchResults.value ?? []).map(result => [result.pairingUuid, result])))

async function onScoreSelect(pairingUuid: string, score: MatchScore) {
  const pairing = pairingsForRound.value.find(p => p.uuid === pairingUuid)
  const [player1Uuid, player2Uuid] = pairing?.playerUuids ?? []
  if (!player1Uuid || !player2Uuid) return

  try {
    await saveMatchResult.mutateAsync({
      pairingUuid, player1Uuid, player2Uuid, ...score
    })
  } catch { /* toasted by the mutation's own onError */ }
}

function onScoreClear(pairingUuid: string) {
  deleteMatchResult.mutate(pairingUuid)
}

// ─── Drops ──────────────────────────────────────────────────────────────────
const { setDropped } = useTournamentDropsMutations(() => tournamentUuid)

// A drop only takes effect from the next round: this round's match still counts.
function onToggleDrop(playerUuid: string) {
  const roundUuid = round.value?.uuid
  if (!roundUuid) return

  setDropped.mutate({
    playerUuid,
    roundUuid,
    dropped: !dropByPlayerUuid.value.has(playerUuid)
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
  return players.length ? [{ pairing, players, isBye: pairing.playerUuids.length === 1 }] : []
}))

const matchRows = computed<SwissMatchRow[]>(() =>
  matchTables.value.flatMap(({ pairing, players, isBye }) =>
    players.map(player => ({
      pairingUuid: pairing.uuid,
      tableNumber: pairing.tableNumber ?? 0,
      player,
      current: matchResultByPairingUuid.value.get(pairing.uuid) ?? null,
      isBye
    }))))

// ─── Round timer ────────────────────────────────────────────────────────────
function handleTimerExpired() {
  toast.add({
    title: t('tournament.single.roundManager.timerExpiredTitle'),
    description: t('tournament.single.roundManager.timerExpiredDescription', { round: roundNumber }),
    color: 'warning',
    icon: ICONS.timerOff
  })
}

// ─── Advance / turn back round ──────────────────────────────────────────────
const { advanceRoundSwiss, turnBackRoundSwiss }
  = useTournamentSwissRoundsMutations(() => tournamentUuid)
const advancePreviewOpen = ref(false)

// The next round's pairing order: the active players (a dropped one isn't paired
// again) ranked by the live standings, skipping rematches; with an odd count the
// lowest-ranked player without a bye yet gets it. Unlike matchPlayersFor (used for on-screen display, keyed by
// players.uuid same as Commander's own pairing cards),
// SwissTablePreviewModal's confirm hands this straight to
// advance_swiss_round's p_associate_order, which resolves against
// players.associate_uuid — value here MUST be the associate uuid, not the
// player uuid, or the RPC can't resolve anyone (confirmed live: "Could not
// resolve every associate to a registered player of this tournament").
const nextRoundSeedPlayers = computed<TablePlayer[]>(() => {
  const rankedPlayerUuids = liveStandings.value
    .filter(standing => !standing.dropped)
    .map(standing => standing.playerUuid)
  const orderedPlayerUuids = pairSwissRound(
    rankedPlayerUuids, playedPairs.value, byePlayerUuids.value
  )
  return orderedPlayerUuids.flatMap((playerUuid) => {
    const associateUuid = associateUuidFor(playerUuid)
    return associateUuid ? [{ value: associateUuid, label: labelFor(playerUuid) }] : []
  })
})

// The next round is paired from the standings, so every table needs its result
// first (a bye has none to enter).
const allResultsEntered = computed(() =>
  pairingsForRound.value.length > 0
  && pairingsForRound.value.every(pairing =>
    pairing.playerUuids.length === 1 || matchResultByPairingUuid.value.has(pairing.uuid)))

// Players still waiting for their table's result (a bye has none to enter).
const pendingPlayerUuids = computed(() => pairingsForRound.value
  .filter(pairing =>
    pairing.playerUuids.length > 1 && !matchResultByPairingUuid.value.has(pairing.uuid))
  .flatMap(pairing => pairing.playerUuids))

const tournamentIsEnded = computed(() =>
  isLastRoundOfTournament.value && round.value?.status === 'completed')

function openAdvancePreview() {
  advancePreviewOpen.value = true
}

async function onAdvanceConfirm(associateOrder: string[]) {
  try {
    await advanceRoundSwiss.mutateAsync({ currentRoundNumber: roundNumber, associateOrder })
    advancePreviewOpen.value = false
  } catch { /* toasted by the mutation's own onError */ }
}

async function endTournament() {
  try {
    await advanceRoundSwiss.mutateAsync({ currentRoundNumber: roundNumber })
  } catch { /* toasted by the mutation's own onError */ }
}

async function onTurnBack() {
  try {
    await turnBackRoundSwiss.mutateAsync(roundNumber)
    emit('turnedBack')
  } catch { /* toasted by the mutation's own onError */ }
}

watch(() => autoOpenAdvancePreview, (value) => {
  if (!value) return
  advancePreviewOpen.value = true
  emit('advancePreviewAutoOpened')
}, { immediate: true })
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
            v-for="{ pairing, players, isBye } in matchTables"
            :key="pairing.uuid"
            :table-number="pairing.tableNumber ?? 0"
            :players="players"
            :is-bye="isBye"
            :current="matchResultByPairingUuid.get(pairing.uuid)"
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
