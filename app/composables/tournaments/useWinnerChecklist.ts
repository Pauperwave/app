// app\composables\tournaments\useWinnerChecklist.ts
// "Vincitori tavoli" checklist (booster/prize hand-out tracking) — ported
// from MagicTheGathering/league's useWinnerChecklist.ts (user request,
// 2026-09-17: this was flagged as a completely missing feature, "todo
// list", must be copied with all functionality). Who won is derived live
// in CommanderRoundManager.vue from existing pairing/result data (no new
// query needed here) — this composable only persists the "booster handed
// out" check-off state, keyed per tournament+round so it naturally resets
// every round.
//
// League persists via its own hand-rolled getCached/setCached localStorage
// helper; this app already has its own equivalent convention established
// this session for exactly this kind of client-only per-tournament state
// (see usePairingWeights.ts) — VueUse's useStorage, explicit import per
// this app's own documented useStorage auto-import-collision gotcha.
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
