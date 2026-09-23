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
}>>
type TurnBackMutation = ReturnType<typeof useRoundLifecycleMutation<number>>

export function useRoundAdvanceFlow(options: {
  roundNumber: number
  advance: AdvanceMutation
  turnBack: TurnBackMutation
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
    roundNumber, advance, turnBack, autoOpenAdvancePreview,
    onTurnedBack, onAdvancePreviewAutoOpened
  } = options

  const advancePreviewOpen = ref(false)

  function openAdvancePreview() {
    advancePreviewOpen.value = true
  }
  async function onAdvanceConfirm(associateOrder: string[]) {
    try {
      await advance.mutateAsync({ currentRoundNumber: roundNumber, associateOrder })
      advancePreviewOpen.value = false
    } catch { /* toasted by the mutation's own onError */ }
  }
  async function endTournament() {
    try {
      await advance.mutateAsync({ currentRoundNumber: roundNumber })
    } catch { /* toasted by the mutation's own onError */ }
  }
  async function onTurnBack() {
    try {
      await turnBack.mutateAsync(roundNumber)
      onTurnedBack()
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
    endTournament,
    onTurnBack
  }
}
