// app\composables\tournaments\rounds\useRoundAdvanceFlow.ts
// Shared "advance round N / end tournament / turn back" orchestration behind
// useCommanderRoundLifecycle.ts/useSwissRoundLifecycle.ts: the same
// advancePreviewOpen/openAdvancePreview/onAdvanceConfirm/endTournament/onTurnBack shape and
// autoOpenAdvancePreview watcher, differing only in which mutation (Commander vs Swiss) is called.
// Each caller owns its mutation composable and nextRoundSeedPlayers/allXEntered; only this shell is
// shared.
type AdvanceMutation = ReturnType<typeof useRoundLifecycleMutation<{
  currentRoundNumber: number
  associateOrder?: string[]
  // Commander only — the confirmed table split; Swiss pairs from the order alone.
  tableSizes?: number[]
}>>
type TurnBackMutation = ReturnType<typeof useRoundLifecycleMutation<number>>
type ReopenMutation = ReturnType<typeof useRoundLifecycleMutation<undefined>>

export function useRoundAdvanceFlow(options: {
  roundNumber: number
  advance: AdvanceMutation
  turnBack: TurnBackMutation
  reopen: ReopenMutation
  autoOpenAdvancePreview: MaybeRefOrGetter<boolean>
  // Two named callbacks rather than Vue's generated `emit`: its overloaded type isn't assignable to
  // a plain `(event: 'a' | 'b') => void` union-parameter type, and unifying the overloads for
  // eslint's unified-signatures rule breaks that assignability again
  onTurnedBack: () => void
  onAdvancePreviewAutoOpened: () => void
}) {
  const {
    roundNumber, advance, turnBack, reopen, autoOpenAdvancePreview,
    onTurnedBack, onAdvancePreviewAutoOpened
  } = options

  const advancePreviewOpen = ref(false)

  function openAdvancePreview() {
    advancePreviewOpen.value = true
  }
  async function onAdvanceConfirm(associateOrder: string[], tableSizes?: number[]) {
    try {
      await advance.mutateAsync({ currentRoundNumber: roundNumber, associateOrder, tableSizes })
      advancePreviewOpen.value = false
    } catch { /* toasted by the mutation's own onError */ }
  }
  // Ending the tournament and turning a round back both ask first: the buttons only open the
  // confirm, endTournament/onTurnBack run the action
  const turnBackConfirmOpen = ref(false)
  const endConfirmOpen = ref(false)
  function requestTurnBack() {
    turnBackConfirmOpen.value = true
  }
  function requestEndTournament() {
    endConfirmOpen.value = true
  }
  async function endTournament() {
    try {
      await advance.mutateAsync({ currentRoundNumber: roundNumber })
      endConfirmOpen.value = false
    } catch { /* toasted by the mutation's own onError */ }
  }
  async function onTurnBack() {
    try {
      await turnBack.mutateAsync(roundNumber)
      turnBackConfirmOpen.value = false
      onTurnedBack()
    } catch { /* toasted by the mutation's own onError */ }
  }
  // The way back from "Termina torneo": nothing is deleted, the last round is editable again.
  async function reopenTournament() {
    try {
      await reopen.mutateAsync(undefined)
    } catch { /* toasted by the mutation's own onError */ }
  }

  // index.vue flips autoOpenAdvancePreview after deleting round `roundNumber + 1`, asking this (the
  // previous) round to reopen its "next round" preview so the organizer lands back on the table
  // arrangement to redo
  watch(() => toValue(autoOpenAdvancePreview), (value) => {
    if (!value) return
    advancePreviewOpen.value = true
    onAdvancePreviewAutoOpened()
  }, { immediate: true })

  return {
    advancePreviewOpen,
    openAdvancePreview,
    onAdvanceConfirm,
    turnBackConfirmOpen,
    endConfirmOpen,
    requestTurnBack,
    requestEndTournament,
    endTournament,
    onTurnBack,
    reopenTournament
  }
}
