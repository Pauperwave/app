// app\composables\tournaments\rounds\useCommanderRoundSubmitHandlers.ts
// Every modal-submit / dev quick-action mutation for CommanderRoundManager.vue
// — mirrors league's own useTournamentSubmitHandlers.ts (all "what happens on
// submit" handlers live in one composable, not split per modal) plus the
// dev-only reset/quick-fill/draw actions, which league split into its own
// PairingsCard.vue confirm-dialog state machine but this app keeps alongside
// the other handlers since there's no separate Pinia-store-backed component
// to own them here.
import type { CommanderRoundData } from './useCommanderRoundData'
import type { CommanderRoundModals } from './useCommanderRoundModals'

export function useCommanderRoundSubmitHandlers(options: {
  tournamentUuid: MaybeRefOrGetter<string>
  roundData: CommanderRoundData
  modals: CommanderRoundModals
}) {
  const { tournamentUuid, roundData, modals } = options
  const { t } = useI18n()
  const toast = useToast()
  const { pairingsForRound } = roundData

  // ─── Ranking / draw ─────────────────────────────────────────────────────────
  const { saveRanking } = useTournamentRoundResultsMutations(tournamentUuid)

  async function onScoreConfirm(ranking: { playerUuid: string, position: number }[]) {
    const pairingUuid = modals.activeScorePairingUuid.value
    if (!pairingUuid) return
    try {
      await saveRanking.mutateAsync(
        ranking.map(r => ({ pairingUuid, playerUuid: r.playerUuid, position: r.position }))
      )
      modals.scoreModalOpen.value = false
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

  // ─── Kills ──────────────────────────────────────────────────────────────────
  const { recordKill, removeKill } = useTournamentKillsMutations(tournamentUuid)

  function onKillConnect(killerUuid: string, killedPlayerUuid: string) {
    const pairingUuid = modals.activeKillPairingUuid.value
    if (!pairingUuid) return
    recordKill.mutate({ pairingUuid, killerUuid, killedPlayerUuid })
  }
  function onKillRemove(killerUuid: string, killedPlayerUuid: string) {
    const kill = modals.activeKillEvents.value.find(k =>
      k.killerUuid === killerUuid && k.killedPlayerUuid === killedPlayerUuid)
    if (kill) removeKill.mutate(kill.uuid)
  }

  // ─── Votes ──────────────────────────────────────────────────────────────────
  const { castVote } = useTournamentVotesMutations(tournamentUuid)

  async function onVotesSubmit(
    brewVotePlayerUuid: string | null, playVotePlayerUuid: string | null
  ) {
    const current = modals.activeVotes.value
    if (!current) return
    const { pairingUuid, playerUuid } = current
    if (brewVotePlayerUuid) {
      await castVote.mutateAsync({
        pairingUuid, voterUuid: playerUuid, votedPlayerUuid: brewVotePlayerUuid, voteType: 'brew'
      })
    }
    if (playVotePlayerUuid) {
      await castVote.mutateAsync({
        pairingUuid, voterUuid: playerUuid, votedPlayerUuid: playVotePlayerUuid, voteType: 'play'
      })
    }
  }

  // ─── Commander select ───────────────────────────────────────────────────────
  const { selectCommander } = useCommanderDecksMutations(tournamentUuid)

  async function onCommanderConfirm(commander1Name: string | null, commander2Name: string | null) {
    const current = modals.activeCommander.value
    if (!current || !commander1Name) return
    try {
      await selectCommander.mutateAsync({
        pairingUuid: current.pairingUuid, playerUuid: current.playerUuid,
        commander1Name, commander2Name
      })
    } catch (err) {
      toast.add({
        title: t('tournament.single.commanderModal.errorTitle'),
        description: toErrorMessage(err),
        color: 'error'
      })
    }
  }

  // ─── Reset / quick-fill / draw confirm dialog (dev-only) ────────────────────
  const { resetPairing, undrawPairing } = useTournamentPairingResetMutation(tournamentUuid)

  // "Compila" test-fill — sequential ranking, one kill, catalog's top
  // commander for everyone, circular votes. Picks a real commander (not a
  // fake name) so the filled table renders actual card art like a real entry
  // would — same "most popular first" order CommanderSearch.vue shows for an
  // empty query.
  const { data: commanderCatalog } = useCommanderCatalogQuery()
  const firstCommanderName = computed(() => {
    const sorted = [...(commanderCatalog.value ?? [])]
      .sort((a, b) => (a.edhrecRank ?? 999999) - (b.edhrecRank ?? 999999))
    return sorted[0]?.name ?? 'Test Commander'
  })

  async function fillTable(pairingUuid: string) {
    const pairing = pairingsForRound.value.find(p => p.uuid === pairingUuid)
    if (!pairing) return
    const [first, second, ...rest] = pairing.playerUuids
    if (!first || !second) return
    const playerUuids = [first, second, ...rest]

    await saveRanking.mutateAsync(
      playerUuids.map((playerUuid, index) => ({ pairingUuid, playerUuid, position: index + 1 }))
    )
    recordKill.mutate({ pairingUuid, killerUuid: first, killedPlayerUuid: second })
    for (const playerUuid of playerUuids) {
      await selectCommander.mutateAsync({
        pairingUuid, playerUuid, commander1Name: firstCommanderName.value, commander2Name: null
      })
    }
    for (let i = 0; i < playerUuids.length; i++) {
      const voter = playerUuids[i]
      const votedPlayer = playerUuids[(i + 1) % playerUuids.length]
      if (!voter || !votedPlayer) continue
      await castVote.mutateAsync({
        pairingUuid, voterUuid: voter, votedPlayerUuid: votedPlayer, voteType: 'brew'
      })
      await castVote.mutateAsync({
        pairingUuid, voterUuid: voter, votedPlayerUuid: votedPlayer, voteType: 'play'
      })
    }
  }

  async function onConfirmDialogConfirm() {
    const dialog = modals.confirmDialog.value
    if (!dialog) return
    try {
      if (dialog.type === 'reset') {
        await resetPairing.mutateAsync(dialog.pairingUuid)
      } else if (dialog.type === 'fill') {
        await fillTable(dialog.pairingUuid)
      } else if (dialog.type === 'draw') {
        await declareDraw(dialog.pairingUuid)
      } else if (dialog.type === 'undraw') {
        await undrawPairing.mutateAsync(dialog.pairingUuid)
      } else {
        await Promise.all(pairingsForRound.value.map(pairing => fillTable(pairing.uuid)))
      }
    } catch {
      // Individual mutations already toast their own errors.
    }
    modals.confirmDialog.value = null
  }

  return {
    saveRanking,
    onScoreConfirm,
    declareDraw,
    recordKill,
    removeKill,
    onKillConnect,
    onKillRemove,
    castVote,
    onVotesSubmit,
    selectCommander,
    onCommanderConfirm,
    resetPairing,
    undrawPairing,
    fillTable,
    onConfirmDialogConfirm
  }
}
