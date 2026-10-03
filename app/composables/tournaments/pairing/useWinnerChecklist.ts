// app\composables\tournaments\pairing\useWinnerChecklist.ts
// "Vincitori tavoli" checklist (booster/prize hand-out tracking), ported from league's
// useWinnerChecklist.ts. Who won is derived live in CommanderRoundManager.vue from pairing/result
// data; this composable only persists the "booster handed out" check-off state, keyed per
// tournament+round so it resets every round.
//
// Persisted via VueUse's useStorage (explicit import, see the useStorage auto-import collision in
// CLAUDE.md), the convention for client-only per-tournament state (see usePairingWeights.ts)
import { useStorage } from '@vueuse/core'

export function useWinnerChecklist(
  tournamentUuid: MaybeRefOrGetter<string>,
  roundNumber: MaybeRefOrGetter<number>
) {
  const checked = useStorage<Record<string, boolean>>(
    () => `winner-checklist-${toValue(tournamentUuid)}-${toValue(roundNumber)}`,
    {}
  )

  function toggle(playerUuid: string) {
    checked.value[playerUuid] = !checked.value[playerUuid]
  }

  return { checked, toggle }
}
