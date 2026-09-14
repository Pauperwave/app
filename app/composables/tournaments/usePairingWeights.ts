// app\composables\tournaments\usePairingWeights.ts
// Per-tournament localStorage persistence for the pairing optimizer's
// weight sliders — ported from MagicTheGathering/league's
// pairingPreferences.ts (getPairingWeights/savePairingWeights), rebuilt on
// VueUse's useStorage (already this app's convention for local-only state,
// see AcceptancePicker.vue's testPayments) instead of hand-rolled
// localStorage get/set. tournamentUuid replaces league's numeric
// tournamentId as the per-tournament storage key.
import type { PairingWeights } from '~/types'
// Explicit import, not auto-import — see CLAUDE.md's useStorage
// auto-import-collision note (Nitro's server-side useStorage shadows
// VueUse's client composable of the same name).
import { useStorage } from '@vueuse/core'

export function usePairingWeights(tournamentUuid: MaybeRefOrGetter<string>) {
  return useStorage<PairingWeights>(
    () => `pairing-weights-${toValue(tournamentUuid)}`,
    { ...DEFAULT_PAIRING_WEIGHTS }
  )
}
