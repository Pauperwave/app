// app\composables\tournaments\useCommanderRoundModals.ts
// All modal open/selected-id state for CommanderRoundManager.vue, plus the
// "what should this modal currently show" derived computeds — mirrors
// league's own useTournamentModals.ts (a single flat state container for
// every modal, not one composable per modal) rather than splitting further
// by modal type: the alternative (a useRoundScoreModal/useRoundKillModal/...
// per modal) would force shared logic like commanderDeckFor/positionsFor
// lookups to be duplicated or cross-imported between them for no real
// readability gain. Submitting a modal is a separate concern — see
// useCommanderRoundSubmitHandlers.ts.
import type { TablePlayer } from '~/types'
import type { CommanderTableResult } from './useCommanderScoring'
import type { CommanderRoundData } from './useCommanderRoundData'

export function useCommanderRoundModals(options: {
  tournamentUuid: MaybeRefOrGetter<string>
  roundData: CommanderRoundData
}) {
  const { tournamentUuid, roundData } = options
  const { t } = useI18n()
  const {
    pairingsForRound, tablePlayersFor, positionsFor, killsFor, votesFor,
    commanderDeckFor, isPairingDraw
  } = roundData

  // ─── Ranking modal ──────────────────────────────────────────────────────────
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
  const activeScoreTableNumber = computed<number | null>(() => {
    const pairing = pairingsForRound.value.find(p => p.uuid === activeScorePairingUuid.value)
    return pairing?.tableNumber ?? null
  })

  // ─── "Punteggi" (read-only score breakdown) ─────────────────────────────────
  const { data: rulesetPoints } = useRulesetPointsQuery(tournamentUuid)
  const scoresModalOpen = ref(false)
  const activeScoresPairingUuid = ref<string | null>(null)

  function openScoresModal(pairingUuid: string) {
    activeScoresPairingUuid.value = pairingUuid
    scoresModalOpen.value = true
  }
  const activeScoresTableNumber = computed(() =>
    pairingsForRound.value.find(p => p.uuid === activeScoresPairingUuid.value)?.tableNumber ?? 0)
  const activeScoresPlayers = computed<TablePlayer[]>(() => {
    const pairing = pairingsForRound.value.find(p => p.uuid === activeScoresPairingUuid.value)
    return pairing ? tablePlayersFor(pairing) : []
  })
  // Same tableResults shape useLiveCommanderStandings.ts builds per pairing —
  // duplicated here rather than exported from there, since that composable's
  // version is folded into its own accumulator loop, not returned standalone.
  const activeScoresTableResults = computed<CommanderTableResult[]>(() => {
    const pairing = pairingsForRound.value.find(p => p.uuid === activeScoresPairingUuid.value)
    if (!pairing) return []
    return pairing.playerUuids.map(playerUuid => ({
      playerUuid,
      position: positionsFor(pairing.uuid).get(playerUuid) ?? null,
      numberOfKills: killsFor(pairing.uuid).filter(k => k.killerUuid === playerUuid).length,
      brewVotesReceived: votesFor(pairing.uuid)
        .filter(v => v.votedPlayerUuid === playerUuid && v.voteType === 'brew').length,
      playVotesReceived: votesFor(pairing.uuid)
        .filter(v => v.votedPlayerUuid === playerUuid && v.voteType === 'play').length
    }))
  })

  // ─── Kill tracker modal ─────────────────────────────────────────────────────
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

  // ─── Votes modal ────────────────────────────────────────────────────────────
  const votesModalOpen = ref(false)
  const activeVotes = ref<{ pairingUuid: string, playerUuid: string } | null>(null)

  function openVotesModal(pairingUuid: string, playerUuid: string) {
    activeVotes.value = { pairingUuid, playerUuid }
    votesModalOpen.value = true
  }
  const activeVotesSelectedPlayer = computed<TablePlayer | null>(() => {
    if (!activeVotes.value) return null
    return {
      value: activeVotes.value.playerUuid,
      label: roundData.labelFor(activeVotes.value.playerUuid)
    }
  })
  const activeVotesOtherPlayers = computed<TablePlayer[]>(() => {
    const current = activeVotes.value
    if (!current) return []
    const pairing = pairingsForRound.value.find(p => p.uuid === current.pairingUuid)
    if (!pairing) return []
    return tablePlayersFor(pairing).filter(p => p.value !== current.playerUuid)
  })
  const activeVotesExisting = computed(() => {
    const current = activeVotes.value
    if (!current) return []
    return votesFor(current.pairingUuid)
      .filter(v => v.voterUuid === current.playerUuid)
      .map(v => ({ votedPlayerUuid: v.votedPlayerUuid, voteType: v.voteType }))
  })

  // Every commander deck currently on record for this round, resolved to
  // names in one batch query — feeds CommanderVoteCard's art (via
  // commanderNameForVotes) inside the votes modal, keyed by the vote's own pairing.
  const roundCommanderDeckUuids = computed(() =>
    [...new Set((roundData.results.value ?? [])
      .map(r => r.commanderDeckUuid)
      .filter((uuid): uuid is string => !!uuid))])
  const { data: roundCommanderDecks } = useCommanderDecksByUuidsQuery(roundCommanderDeckUuids)

  function commanderNameForVotes(playerUuid: string): string | null {
    const current = activeVotes.value
    if (!current) return null
    const deckUuid = commanderDeckFor(current.pairingUuid, playerUuid)
    if (!deckUuid) return null
    const deck = roundCommanderDecks.value?.get(deckUuid)
    if (!deck) return null
    return [deck.commander1Name, deck.commander2Name].filter(Boolean).join(' / ')
  }

  // ─── Commander select modal ─────────────────────────────────────────────────
  const commanderModalOpen = ref(false)
  const activeCommander = ref<{ pairingUuid: string, playerUuid: string } | null>(null)

  function openCommanderModal(pairingUuid: string, playerUuid: string) {
    activeCommander.value = { pairingUuid, playerUuid }
    commanderModalOpen.value = true
  }
  const activeCommanderPlayerName = computed(() =>
    activeCommander.value ? roundData.labelFor(activeCommander.value.playerUuid) : '')
  const activeCommanderTablePlayerUuids = computed(() => {
    const current = activeCommander.value
    if (!current) return []
    const pairing = pairingsForRound.value.find(p => p.uuid === current.pairingUuid)
    return pairing?.playerUuids ?? []
  })
  const activeCommanderCurrent = computed(() => {
    const current = activeCommander.value
    if (!current) return { commander1: null, commander2: null }
    const deckUuid = commanderDeckFor(current.pairingUuid, current.playerUuid)
    const deck = deckUuid ? roundCommanderDecks.value?.get(deckUuid) : undefined
    return { commander1: deck?.commander1Name ?? null, commander2: deck?.commander2Name ?? null }
  })

  // ─── Reset tavolo / quick-fill / draw confirm dialog (dev-only actions share
  // one dialog) ────────────────────────────────────────────────────────────────
  // One confirm dialog reused for all four actions, same state-machine shape
  // as league's own PairingsCard.vue confirmDialog — swapping only which
  // action handleConfirm runs, not four separate dialog instances.
  const confirmDialog = ref<
    { type: 'reset' | 'fill' | 'draw' | 'undraw', pairingUuid: string } | { type: 'fill-all' } | null
  >(null)

  function requestResetTable(pairingUuid: string) {
    confirmDialog.value = { type: 'reset', pairingUuid }
  }
  function requestQuickFill(pairingUuid: string) {
    confirmDialog.value = { type: 'fill', pairingUuid }
  }
  function requestQuickFillAll() {
    confirmDialog.value = { type: 'fill-all' }
  }
  // "Patta" ("draw") can only be declared on an empty table, or toggled back
  // off ("undraw") from an already-drawn one — same shared confirm dialog as
  // reset/fill, matching league's PairingsCard.vue handleDrawTable.
  function requestDraw(pairingUuid: string) {
    confirmDialog.value = { type: isPairingDraw(pairingUuid) ? 'undraw' : 'draw', pairingUuid }
  }
  const isConfirmDialogOpen = computed({
    get: () => confirmDialog.value !== null,
    set: (value) => { if (!value) confirmDialog.value = null }
  })
  const confirmDialogTableNumber = computed(() => {
    if (!confirmDialog.value || confirmDialog.value.type === 'fill-all') return null
    const pairingUuid = confirmDialog.value.pairingUuid
    return pairingsForRound.value.find(p => p.uuid === pairingUuid)?.tableNumber ?? null
  })
  const confirmDialogCopy = computed(() => {
    if (!confirmDialog.value) return null
    if (confirmDialog.value.type === 'reset') {
      return {
        title: t('tournament.single.roundManager.resetConfirmTitle'),
        description: t('tournament.single.roundManager.resetConfirmDescription'),
        warning: t('tournament.single.roundManager.resetConfirmWarning'),
        confirmLabel: t('tournament.single.roundManager.resetTableTooltip'),
        confirmIcon: ICONS.rotateBack,
        confirmColor: 'error' as const
      }
    }
    if (confirmDialog.value.type === 'fill') {
      return {
        title: t('tournament.single.roundManager.quickFillConfirmTitle'),
        description: t('tournament.single.roundManager.quickFillConfirmDescription'),
        warning: t('tournament.single.roundManager.quickFillConfirmWarning'),
        confirmLabel: t('tournament.single.roundManager.quickFillTooltip'),
        confirmIcon: ICONS.quickAction,
        confirmColor: 'warning' as const
      }
    }
    if (confirmDialog.value.type === 'draw') {
      return {
        title: t('tournament.single.roundManager.drawConfirmTitle'),
        description: t('tournament.single.roundManager.drawConfirmDescription'),
        warning: t('tournament.single.roundManager.drawConfirmWarning'),
        confirmLabel: t('tournament.single.roundManager.drawButton'),
        confirmIcon: ICONS.draw,
        confirmColor: 'warning' as const
      }
    }
    if (confirmDialog.value.type === 'undraw') {
      return {
        title: t('tournament.single.roundManager.undrawConfirmTitle'),
        description: t('tournament.single.roundManager.undrawConfirmDescription'),
        warning: undefined,
        confirmLabel: t('tournament.single.roundManager.undrawConfirmLabel'),
        confirmIcon: ICONS.undo,
        confirmColor: 'warning' as const
      }
    }
    return {
      title: t('tournament.single.roundManager.quickFillAllConfirmTitle'),
      description: t('tournament.single.roundManager.quickFillAllConfirmDescription'),
      warning: t('tournament.single.roundManager.quickFillConfirmWarning'),
      confirmLabel: t('tournament.single.roundManager.quickFillAllTooltip'),
      confirmIcon: ICONS.quickAction,
      confirmColor: 'warning' as const
    }
  })

  return {
    rulesetPoints,
    scoreModalOpen,
    activeScorePairingUuid,
    openScoreModal,
    activeScorePlayers,
    activeScoreTableNumber,
    scoresModalOpen,
    activeScoresPairingUuid,
    openScoresModal,
    activeScoresTableNumber,
    activeScoresPlayers,
    activeScoresTableResults,
    killModalOpen,
    activeKillPairingUuid,
    openKillModal,
    activeKillPlayers,
    activeKillEvents,
    votesModalOpen,
    activeVotes,
    openVotesModal,
    activeVotesSelectedPlayer,
    activeVotesOtherPlayers,
    activeVotesExisting,
    commanderNameForVotes,
    commanderModalOpen,
    activeCommander,
    openCommanderModal,
    activeCommanderPlayerName,
    activeCommanderTablePlayerUuids,
    activeCommanderCurrent,
    confirmDialog,
    requestResetTable,
    requestQuickFill,
    requestQuickFillAll,
    requestDraw,
    isConfirmDialogOpen,
    confirmDialogTableNumber,
    confirmDialogCopy
  }
}

export type CommanderRoundModals = ReturnType<typeof useCommanderRoundModals>
