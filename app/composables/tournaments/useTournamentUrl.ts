// app\composables\tournaments\useTournamentUrl.ts
// Bidirectional sync between the tournament detail page's URL query params
// and its stepper/preview-modal state — ported from MagicTheGathering/league's
// useTournamentUrl.ts (user request, 2026-09-15), scoped down to what
// app/pages/(competitions)/tournaments/[tournamentId]/index.vue actually has
// today: a single flat stepper (`step`, league's phase+round split doesn't
// apply — app's stepper already flattens acceptance/pods/round-N/awards/
// leaderboard into one slot list) and the pods-preview modal (`preview`,
// same param name/meaning as league's own "preview overlay on top of the
// current step" concept). League's scoreModal/killModal/votesModal/
// commanderModal params have no equivalent yet — app has no round-in-progress
// result-entry UI to deep-link into — add them here the same way once that
// UI exists, rather than inventing a different pattern then.
//
// Always `router.replace` (never `push`), so navigating the stepper doesn't
// pollute browser history — same reasoning as league's own composable.
export function useTournamentUrl() {
  const route = useRoute()
  const router = useRouter()

  const stepFromQuery = computed(() => route.query.step as string | undefined)
  const previewFromQuery = computed(() => route.query.preview === '1')

  function setQueryParam(key: string, value: string | null) {
    // Skips the replace entirely when the URL already matches — same
    // optimization league's own syncUrl() applies, avoiding a no-op
    // navigation on every reload (route.query[key] is only ever a string
    // here, this composable never sets array-valued params).
    const current = route.query[key]
    if ((current ?? null) === value) return

    const newQuery: Record<string, string> = {}
    for (const [k, v] of Object.entries(route.query)) {
      if (typeof v === 'string' && k !== key) newQuery[k] = v
    }
    if (value !== null) newQuery[key] = value
    router.replace({ query: newQuery })
  }

  function syncStep(slot: string) {
    setQueryParam('step', slot)
  }

  function syncPreview(isOpen: boolean) {
    setQueryParam('preview', isOpen ? '1' : null)
  }

  return { stepFromQuery, syncStep, previewFromQuery, syncPreview }
}
