// app\composables\query\useQueryFreshness.ts
import type { DataStateStatus } from '@pinia/colada'

// Pinia Colada's cache entry tracks a `when` timestamp (queryCache.getEntries()[0].when), but the
// entry is markRaw()ed (no reactivity, for cache performance), so reading it in a computed would
// never re-render. Tracking our own timestamp off the query's public isLoading/status refs avoids
// that non-reactive internal
export function useQueryFreshness(isLoading: Ref<boolean>, status: Ref<DataStateStatus>) {
  const lastUpdatedAt = ref<Date | null>(null)

  watch(isLoading, (loading, wasLoading) => {
    if (!loading && wasLoading && status.value === 'success') {
      lastUpdatedAt.value = new Date()
    }
  })

  // Data already in the cache when this runs (e.g. a second page reusing the query key) never fires
  // the transition above, and Colada doesn't expose when it was fetched without the raw internals:
  // "now" is close enough
  if (!isLoading.value && status.value === 'success' && !lastUpdatedAt.value) {
    lastUpdatedAt.value = new Date()
  }

  return { lastUpdatedAt }
}
