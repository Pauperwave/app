// app\composables\tournaments\useWalkInPlayers.ts
// "Aggiungi giocatori" (walk-ins) for AcceptancePicker.vue — ported from
// MagicTheGathering/league's WaitingList.vue, extracted out of
// AcceptancePicker.vue 2026-09-18 alongside useAcceptancePickerPayments.ts.
// For any club associate not already pre-registered or accepted, searched/
// multi-selected and added either straight into "Iscritti (Pagato)" or into
// "Pre-registrati" — skipping the pre-registration step entirely for the
// former. Reads the real associates roster (not just the pre-registered
// pool), since a walk-in by definition isn't one of tonight's pre-registered
// names.
import type { ComputedRef } from 'vue'

export function useWalkInPlayers(options: {
  tournamentUuid: MaybeRefOrGetter<string>
  /** Every associate uuid already pre-registered or accepted for this
   * tournament — a walk-in candidate must not already be in either list. */
  knownPlayerIds: ComputedRef<Set<string>>
}) {
  const { tournamentUuid, knownPlayerIds } = options
  const { data: associatesData } = useAssociatesQuery()
  const { registerAssociates } = useTournamentRegistrationsMutations(tournamentUuid)

  // Only currently-active members are real "giocatori" — excludes
  // pending/rejected requests and expired/unpaid/to_renew memberships.
  // Also excludes APS Pauperwave's own registry record (PW-0000, uuid
  // constant from useTransactionFormOptions) — the association itself, not
  // a player, same exclusion useTransactionFormFields.ts already applies
  // for payers.
  const addableAssociates = computed(() =>
    (associatesData.value ?? []).filter(associate =>
      !knownPlayerIds.value.has(associate.uuid)
      && associate.uuid !== APS_PAUPERWAVE_ASSOCIATE_UUID
      && associate.membership_status === 'active'))
  const addableAssociateOptions = computed(() => addableAssociates.value.map(associate => ({
    value: associate.uuid,
    label: `${associate.first_name} ${associate.last_name}`
  })))

  const addablePlayerIds = ref<string[]>([])
  function addSelectedAssociates() {
    if (!addablePlayerIds.value.length) return
    registerAssociates.mutate({ associateUuids: addablePlayerIds.value, status: 'checked_in' })
    addablePlayerIds.value = []
  }

  // Same mechanism as above, but onto "Pre-registrati" itself rather than
  // straight into "Iscritti (Pagato)" — shares the same
  // addableAssociateOptions pool, since knownPlayerIds already excludes
  // anyone in either list regardless of which one they get added to.
  const addableSourcePlayerIds = ref<string[]>([])
  function addSelectedToPreRegistered() {
    if (!addableSourcePlayerIds.value.length) return
    registerAssociates.mutate({ associateUuids: addableSourcePlayerIds.value })
    addableSourcePlayerIds.value = []
  }

  return {
    addableAssociateOptions,
    addablePlayerIds,
    addSelectedAssociates,
    addableSourcePlayerIds,
    addSelectedToPreRegistered
  }
}
