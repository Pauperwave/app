// app\composables\tournaments\pairing\usePairingWeights.ts
// Per-tournament localStorage persistence for the pairing optimizer's weight sliders, ported from
// league's pairingPreferences.ts but built on VueUse's useStorage (this app's local-only state
// convention, see AcceptancePicker.vue's testPayments) instead of hand-rolled get/set;
// tournamentUuid is the per-tournament storage key
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
