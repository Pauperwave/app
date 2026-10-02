// app\composables\tournaments\rounds\useRoundAdvanceFlow.ts
// Shared "advance round N / end tournament / turn back" orchestration
// behind both round managers' own lifecycle composables
// (useCommanderRoundLifecycle.ts/useSwissRoundLifecycle.ts) — same
// advancePreviewOpen/openAdvancePreview/onAdvanceConfirm/endTournament/
// onTurnBack shape and autoOpenAdvancePreview watcher, differing only in
// which mutation (Commander vs Swiss) each calls (fallow:dupes, 2026-09-24,
// flagged once useSwissRoundLifecycle.ts existed alongside the Commander
// one it was modeled on). Each caller still owns its own mutation
// composable and nextRoundSeedPlayers/allXEntered computation — only this
// generic shell is shared.
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
  // Two named callbacks rather than passing Vue's own generated `emit`
  // straight through — its overloaded type (one call signature per event
  // name) isn't structurally assignable to a plain `(event: 'a' | 'b') =>
  // void` union-parameter type, and unifying the overloads to satisfy
  // eslint's own unified-signatures rule breaks that assignability again.
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
  // Ending the tournament and turning a round back both ask first (user request, 2026-10-03): the
  // buttons only open the confirm, endTournament/onTurnBack run the action itself.
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

  // index.vue flips autoOpenAdvancePreview on right after deleting round
  // `roundNumber + 1`, asking this (the previous) round to reopen its own
  // "next round" preview so the organizer lands straight back on the table
  // arrangement they're meant to redo.
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
