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

  // Confirming the pods step changes `step` AND `preview` in the same tick
  // (podsModalOpen -> false, currentStep -> +1) — two independent watchers
  // each calling router.replace() straight away raced against each other
  // (both read `route.query` before either replace had resolved, so
  // whichever ran second clobbered the first's change, leaving a stale
  // `preview=1` stuck in the URL after confirming — confirmed live,
  // 2026-09-17). Coalescing every setQueryParam call within the same tick
  // into a single replace, same "one source of truth, no dual-write to
  // race" fix already documented in this app for UTable's own column-
  // filter race.
  let pendingUpdates: Record<string, string | null> = {}
  let flushScheduled = false

  function flush() {
    flushScheduled = false
    const updates = pendingUpdates
    pendingUpdates = {}

    const newQuery: Record<string, string> = {}
    for (const [k, v] of Object.entries(route.query)) {
      if (typeof v === 'string' && !(k in updates)) newQuery[k] = v
    }
    for (const [k, v] of Object.entries(updates)) {
      if (v !== null) newQuery[k] = v
    }
    router.replace({ query: newQuery })
  }

  function setQueryParam(key: string, value: string | null) {
    const current = route.query[key]
    if ((current ?? null) === value) return

    pendingUpdates[key] = value
    if (!flushScheduled) {
      flushScheduled = true
      nextTick(flush)
    }
  }

  function syncStep(slot: string) {
    setQueryParam('step', slot)
  }

  function syncPreview(isOpen: boolean) {
    setQueryParam('preview', isOpen ? '1' : null)
  }

  return { stepFromQuery, syncStep, previewFromQuery, syncPreview }
}
