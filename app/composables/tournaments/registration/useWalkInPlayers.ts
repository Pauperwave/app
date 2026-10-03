// app\composables\tournaments\registration\useWalkInPlayers.ts
// "Aggiungi giocatori" (walk-ins) for AcceptancePicker.vue, ported from league's WaitingList.vue:
// any club associate not already pre-registered or accepted is searched/multi-selected and added
// straight into "Iscritti (Pagato)" or into "Pre-registrati". Reads the real associates roster,
// since a walk-in isn't one of tonight's pre-registered names.
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

  // Only currently-active members are real "giocatori": excludes pending/rejected requests,
  // expired/unpaid/to_renew memberships and APS Pauperwave's own registry record (PW-0000, the uuid
  // constant from useTransactionFormOptions: the association, not a player), as
  // useTransactionFormFields.ts does for payers
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

  // Same mechanism, but onto "Pre-registrati": shares addableAssociateOptions, since knownPlayerIds
  // excludes anyone in either list
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
