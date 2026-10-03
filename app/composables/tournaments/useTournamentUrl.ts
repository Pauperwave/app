// app\composables\tournaments\useTournamentUrl.ts
// Bidirectional sync between the tournament detail page's URL query params and its
// stepper/preview-modal state, ported from league's useTournamentUrl.ts and scoped to what
// [tournamentId]/index.vue has: a single flat stepper (`step`; league's phase+round split doesn't
// apply) and the pods-preview modal (`preview`, an overlay on the current step). league's
// scoreModal/killModal/votesModal/commanderModal params have no equivalent yet: add them here the
// same way once that result-entry UI exists.
//
// Always `router.replace` (never `push`), so stepper navigation doesn't pollute browser history.
export function useTournamentUrl() {
  const route = useRoute()
  const router = useRouter()

  const stepFromQuery = computed(() => route.query.step as string | undefined)
  const previewFromQuery = computed(() => route.query.preview === '1')

  // Confirming the pods step changes `step` AND `preview` in the same tick: two watchers each
  // calling router.replace() raced (both read `route.query` before either resolved, so the second
  // clobbered the first, leaving a stale `preview=1`). Coalescing every setQueryParam call in a
  // tick into one replace is the same "one source of truth, no dual-write to race" fix as UTable's
  // column-filter race (CLAUDE.md)
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
