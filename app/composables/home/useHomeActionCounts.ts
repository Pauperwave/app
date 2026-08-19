// app\composables\home\useHomeActionCounts.ts
// Extracted out of default.vue (2026-08-19), which computed these same four
// counts to feed the sidebar's "Associati"/"Richieste"/"Wanted Cards" nav
// badges. HomeStaff.vue's "Azioni pendenti"/counters sections need the exact
// same numbers, so both now read from here instead of duplicating the
// filters — same 'associates'/'wanted-cards' Pinia Colada cache either way,
// no extra fetch.
export function useHomeActionCounts() {
  const { data: associates } = useAssociatesQuery()

  // Brand-new membership requests waiting on a decision.
  const pendingAssociatesCount = computed(() => (associates.value ?? []).filter(
    associate => associate.membership_request_status === 'pending'
  ).length)

  // Plain approved-roster size — no color, just a count.
  const associatesCount = computed(() => (associates.value ?? []).filter(
    associate => associate.membership_request_status === 'approved'
  ).length)

  // Approved associates whose membership itself (not the request) is
  // lapsing/lapsed — distinct from pendingAssociatesCount above.
  const associatesToRenewCount = computed(() => (associates.value ?? []).filter(
    associate => associate.membership_status === 'to_renew' || associate.membership_status === 'expired'
  ).length)

  const { data: wantedCards } = useWantedCardsQuery()

  const wantedCardsSearchingCount = computed(() => (wantedCards.value ?? []).filter(
    wantedCard => wantedCard.status === 'searching'
  ).length)

  return {
    pendingAssociatesCount,
    associatesCount,
    associatesToRenewCount,
    wantedCardsSearchingCount
  }
}
