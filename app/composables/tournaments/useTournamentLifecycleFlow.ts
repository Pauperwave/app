// app\composables\tournaments\useTournamentLifecycleFlow.ts
// Every "big state transition" for a tournament as a whole — starting it
// (all three format branches: Draft's pods-preview-only, Commander's/1v1's
// real round-1 seating), resetting it back to registration, and routing a
// turned-back round back into the same start-flow modal — extracted out of
// [tournamentId]/index.vue (user request, 2026-09-18) alongside
// useTournamentStepper.ts, once both had grown into the largest, least
// readable parts of that page. Named after league's own
// useTournamentLifecycle.ts, scoped down to what this app actually needs: no
// Pinia session-store resets (this app has none, see CLAUDE.md's Pinia
// Colada + BFF convention), just the mutations and the confirm-dialog/modal
// state around them.
import type { ComputedRef } from 'vue'
import type { AcceptancePickerItem } from '~/components/tournaments/single/AcceptancePicker.vue'
import type { Tournament, TablePlayer } from '~/types'

export function useTournamentLifecycleFlow(options: {
  tournamentUuid: MaybeRefOrGetter<string>
  tournament: ComputedRef<Tournament | null>
  isDraft: ComputedRef<boolean>
  isCommander: ComputedRef<boolean>
  is1v1Format: ComputedRef<boolean>
  acceptedPlayers: Ref<AcceptancePickerItem[]>
  previewFromQuery: ComputedRef<boolean>
  syncPreview: (isOpen: boolean) => void
}) {
  const {
    tournamentUuid, tournament, isDraft, isCommander, is1v1Format, acceptedPlayers,
    previewFromQuery, syncPreview
  } = options

  const toast = useToast()
  const { t } = useI18n()

  // ─── Start ────────────────────────────────────────────────────────────────
  // "Avvio evento" flips the tournament out of registration and into play.
  // Only offered while registration is still open; once in_progress/
  // completed/cancelled/external there's nothing left to start.
  const { setStatus } = useTournamentsMutations()
  const canStartTournament = computed(() => tournament.value?.status === 'registration_open')
  const isStartConfirmOpen = ref(false)

  // Shared by both "no pods step" formats (plain yes/no confirm dialog) and
  // Draft's own pods-preview confirm (onDraftPodsConfirm below) — the actual
  // status flip is identical either way, only what happens right before it
  // (a dialog vs. a pod arrangement) differs. No manual stepper update needed
  // here — useTournamentStepper.ts's defaultStepSlot reacts to the status
  // change itself.
  async function startTournamentByStatusFlip() {
    if (!tournament.value) return
    await setStatus.mutateAsync({ id: tournament.value.id, status: 'in_progress' })
  }

  async function confirmStartTournament() {
    try {
      await startTournamentByStatusFlip()
      isStartConfirmOpen.value = false
    } catch (err) {
      toast.add({
        title: t('tournament.startTournamentErrorTitle'),
        description: toErrorMessage(err),
        color: 'error'
      })
    }
  }

  // ─── Reset ────────────────────────────────────────────────────────────────
  // Wipes every round/pairing/result/standing and puts the tournament back at
  // registration_open, for the two formats that actually have round data to
  // wipe (Commander, 1v1 Swiss). Draft/Cubo Commander/etc. have no
  // round-level DB state yet, so there'd be nothing for this to reset.
  const { resetTournament } = useTournamentResetMutation(tournamentUuid)
  const isResetConfirmOpen = ref(false)
  const canResetTournament = computed(() =>
    (isCommander.value || is1v1Format.value) && tournament.value?.status !== 'registration_open')

  async function confirmResetTournament() {
    try {
      await resetTournament.mutateAsync(undefined)
      isResetConfirmOpen.value = false
    } catch {
      // Toasted by useTournamentResetMutation's own onError — nothing left to do here.
    }
  }

  // ─── Table formation (pods/table-preview modal, shared by round 1 and every
  // round's own "turn back") ─────────────────────────────────────────────────
  // Commander's round 1 pods step's "Confirm" only persists anything for
  // Commander (see PodsManager.vue's own comment); Draft's step stays the
  // existing preview-only toy.
  const { startRoundOne } = useTournamentRoundsMutations(tournamentUuid)
  // 1v1 Swiss's own round-1 seating (Phase 1 of
  // docs/plans/2026-09-15-swiss-pairing-draft-1v1-plan.md) — same
  // "client arranges, RPC seats" split as onPodsConfirm (Commander), calling
  // the Swiss-specific RPC instead (migration 20260918000000).
  const { startRoundOneSwiss } = useTournamentSwissRoundsMutations(tournamentUuid)
  // Shared by both PodsManager.vue (Draft) and TablePreviewModal.vue
  // (Commander) — only one of the two ever renders at a time (isDraft xor
  // isCommander), so one boolean is enough for either.
  const podsModalOpen = ref(false)

  // TablePreviewModal (ported from league) takes TablePlayer[] (value/label),
  // not AcceptancePickerItem's fuller shape — same associate uuid identity
  // either way (AcceptancePickerItem.value).
  const tablePreviewPlayers = computed<TablePlayer[]>(() =>
    acceptedPlayers.value.map(player => ({ value: player.value, label: player.label })))
  const { calculatePods: calculateCommanderPods } = useCommanderPods()
  const { calculatePods: calculateDraftPods } = useDraftPods()
  const { calculatePairing: calculateSwissPairing } = useSwissPairing()
  const canOpenTablePreview = computed(() => {
    if (isCommander.value) return calculateCommanderPods(acceptedPlayers.value.length).canPlay
    if (isDraft.value) return calculateDraftPods(acceptedPlayers.value.length).canPlay
    if (is1v1Format.value) return calculateSwissPairing(acceptedPlayers.value.length).canPlay
    return true
  })

  // "Avvia torneo" — for every format that forms tables before round 1 (not
  // Commander-only), this goes straight into the pairing-preview modal
  // (`preview=1` layered on top of the still-registration phase); the
  // tournament doesn't actually start until the organizer confirms the pod
  // arrangement there. "Cubo Commander" has no round-management flow at all
  // yet, so it stays on the plain confirm dialog too, same as any other
  // format with no table-preview concept.
  function onStartTournamentClick() {
    if (isDraft.value || isCommander.value || is1v1Format.value) {
      podsModalOpen.value = true
      return
    }
    isStartConfirmOpen.value = true
  }

  // "Torna al round precedente" on round 1: once its RPC has wiped round 1
  // back to registration_open, round 1 turning back lands the organizer on
  // "acceptance" with the same table-preview modal "Avvia torneo" opens
  // (there's no dedicated pods step to return to). Round 2+ instead reopens
  // the previous round's own advancePreviewOpen — same mechanism, different
  // destination. No manual stepper update needed in either branch —
  // useTournamentStepper.ts's defaultStepSlot reacts to the round/status
  // change the turn-back mutation itself already caused.
  const pendingAdvancePreviewRound = ref<number | null>(null)
  function onRoundTurnedBack(roundNumber: number) {
    if (roundNumber === 1) {
      podsModalOpen.value = true
      return
    }
    pendingAdvancePreviewRound.value = roundNumber - 1
  }
  function onAdvancePreviewAutoOpened() {
    pendingAdvancePreviewRound.value = null
  }

  async function onPodsConfirm(associateOrder: string[]) {
    try {
      await startRoundOne.mutateAsync(associateOrder)
      podsModalOpen.value = false
    } catch {
      // Toasted by useTournamentRoundsMutations' own onError — nothing left to do here.
    }
  }

  async function onSwissPodsConfirm(associateOrder: string[]) {
    try {
      await startRoundOneSwiss.mutateAsync(associateOrder)
      podsModalOpen.value = false
    } catch {
      // Toasted by useTournamentSwissRoundsMutations' own onError — nothing left to do here.
    }
  }

  // Draft's own pods step has no real persistence yet (PodsManager.vue's own
  // comment) — confirming there still needs to actually start the tournament,
  // same status-flip start-round-one's own RPC does implicitly for Commander.
  async function onDraftPodsConfirm() {
    try {
      await startTournamentByStatusFlip()
    } catch (err) {
      toast.add({
        title: t('tournament.startTournamentErrorTitle'),
        description: toErrorMessage(err),
        color: 'error'
      })
    }
  }

  watch(podsModalOpen, syncPreview)
  watch(previewFromQuery, (isPreview) => {
    if (isPreview && canOpenTablePreview.value) podsModalOpen.value = true
  }, { immediate: true })

  return {
    canStartTournament,
    isStartConfirmOpen,
    confirmStartTournament,
    setStatus,
    canResetTournament,
    isResetConfirmOpen,
    confirmResetTournament,
    resetTournament,
    podsModalOpen,
    tablePreviewPlayers,
    canOpenTablePreview,
    onStartTournamentClick,
    pendingAdvancePreviewRound,
    onRoundTurnedBack,
    onAdvancePreviewAutoOpened,
    onPodsConfirm,
    onSwissPodsConfirm,
    onDraftPodsConfirm,
    startRoundOne,
    startRoundOneSwiss
  }
}
