// app\composables\tournaments\useTournamentLifecycleFlow.ts
// Every "big state transition" of a tournament: starting it (Draft's pods-preview-only, or
// Commander's/1v1's real round-1 seating), resetting it to registration, and routing a turned-back
// round into the same start-flow modal. Split from [tournamentId]/index.vue alongside
// useTournamentStepper.ts; no Pinia session-store resets (see CLAUDE.md's Pinia Colada + BFF
// convention), just the mutations and the confirm-dialog/modal state around them.
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

  // ─── Start ──────────────────────────────────────────────────────────────── "Avvio evento" flips
  // the tournament out of registration into play; only offered while registration is open
  const { setStatus } = useTournamentsMutations()
  const canStartTournament = computed(() => tournament.value?.status === 'registration_open')
  const isStartConfirmOpen = ref(false)

  // Shared by both "no pods step" formats (plain confirm dialog) and Draft's pods-preview confirm
  // (onDraftPodsConfirm): the status flip is identical. No manual stepper update:
  // useTournamentStepper.ts's defaultStepSlot reacts to it
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

  // ─── Reset ──────────────────────────────────────────────────────────────── Wipes every
  // round/pairing/result/standing and returns to registration_open, for the two formats with round
  // data (Commander, 1v1 Swiss); Draft/Cubo Commander have no round-level DB state to reset
  const { resetTournament } = useTournamentResetMutation(tournamentUuid)
  const isResetConfirmOpen = ref(false)
  const { can } = useUserRole()
  const canResetTournament = computed(() => can('cancel-round')
    && (isCommander.value || is1v1Format.value)
    && tournament.value?.status !== 'registration_open')

  async function confirmResetTournament() {
    try {
      await resetTournament.mutateAsync(undefined)
      isResetConfirmOpen.value = false
    } catch {
      // Toasted by useTournamentResetMutation's onError
    }
  }

  // ─── Table formation (pods/table-preview modal, shared by round 1 and every round's "turn back")
  // ─── For Commander, round 1's pods "Confirm" persists (see PodsManager.vue); Draft's step stays
  // preview-only
  const { startRoundOne } = useTournamentRoundsMutations(tournamentUuid)
  // 1v1 Swiss round-1 seating: same "client arranges, RPC seats" split as onPodsConfirm, via the
  // Swiss-specific RPC
  const { startRoundOneSwiss } = useTournamentSwissRoundsMutations(tournamentUuid)
  // Shared by PodsManager.vue (Draft) and TablePreviewModal.vue (Commander); only one renders at a
  // time, so one boolean suffices
  const podsModalOpen = ref(false)
  // Approved tables per round, for the previews reopened by a turn-back.
  const { seatingFor } = useConfirmedSeatings(tournamentUuid)

  // TablePreviewModal takes TablePlayer[] (value/label), not AcceptancePickerItem's fuller shape:
  // same associate uuid identity
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

  // "Avvia torneo": every format that forms tables before round 1 goes straight into the
  // pairing-preview modal (`preview=1` over the registration phase); the tournament only starts
  // once the organizer confirms the arrangement. "Cubo Commander" has no round management yet and
  // keeps the plain confirm dialog
  function onStartTournamentClick() {
    if (isDraft.value || isCommander.value || is1v1Format.value) {
      podsModalOpen.value = true
      return
    }
    isStartConfirmOpen.value = true
  }

  // "Torna al round precedente": on round 1, once its RPC has wiped it back to registration_open,
  // the organizer lands on "acceptance" with the same table-preview modal "Avvia torneo" opens (no
  // dedicated pods step). Round 2+ reopens the previous round's advancePreviewOpen. No manual
  // stepper update: useTournamentStepper.ts's defaultStepSlot reacts
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

  async function onPodsConfirm(
    associateOrder: string[],
    tableSizes: number[],
    shuffleSeed: number | null
  ) {
    try {
      await startRoundOne.mutateAsync({ associateOrder, tableSizes, shuffleSeed })
      podsModalOpen.value = false
    } catch {
      // Toasted by useTournamentRoundsMutations' onError
    }
  }

  async function onSwissPodsConfirm(associateOrder: string[], shuffleSeed: number | null) {
    try {
      await startRoundOneSwiss.mutateAsync({ associateOrder, shuffleSeed })
      podsModalOpen.value = false
    } catch {
      // Toasted by useTournamentSwissRoundsMutations' onError
    }
  }

  // Draft's pods step has no real persistence (see PodsManager.vue): confirming must still start
  // the tournament, the status flip start-round-one's RPC does implicitly for Commander
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
  // Also waits on the accepted players: on a reload they load after the first check, which used to
  // leave the modal closed with ?preview=1 still in the URL.
  watch(() => previewFromQuery.value && canOpenTablePreview.value, (shouldOpen) => {
    if (shouldOpen) podsModalOpen.value = true
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
    seatingFor,
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
