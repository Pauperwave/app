// app\composables\cittadino\useCittadinoQuery.ts
import type { Ref } from 'vue'
import type { CittadinoEvent, CittadinoPlacement } from '~/types'

interface CittadinoResultRow {
  player_uuid: string
  player_name: string
  event_uuid: string
  rank: number
}

interface CittadinoPayload {
  edition: string
  editions: string[]
  events: CittadinoEvent[]
  results: CittadinoResultRow[]
}

// Backed by mock data (no Supabase table yet, see server/api/cittadino.ts and the
// P1 entry in docs/BACKLOG.md). This composable only fetches and normalises raw
// placements; the scoring the regulation specifies — points per placement,
// best-11 selection, tie-break ordering — lives in useCittadinoFilters.ts, which
// owns it because the standings depend on which formats are currently shown.
//
// `selectedEdition` is null until the user picks a tab: the endpoint resolves a
// missing edition to the most recent one, so nothing here has to know which year
// is current.
export function useCittadinoQuery(selectedEdition: Ref<string | null>) {
  const {
    data, pending: loading, error, refresh
  } = useAsyncData(
    () => `cittadino-${selectedEdition.value ?? 'latest'}`,
    () => $fetch<CittadinoPayload>('/api/cittadino', {
      query: { edition: selectedEdition.value ?? undefined }
    }),
    {
      default: () => ({ edition: '', editions: [], events: [], results: [] }),
      watch: [selectedEdition]
    }
  )

  const edition = computed(() => data.value.edition)
  const editions = computed(() => data.value.editions)
  const events = computed<CittadinoEvent[]>(() => data.value.events)

  const placements = computed<CittadinoPlacement[]>(() => data.value.results.map(toBestNPlacement))

  return { edition, editions, events, placements, loading, error, refresh }
}
