// app\composables\query\useQueryFreshness.ts
import type { DataStateStatus } from '@pinia/colada'

// Pinia Colada's own cache entry does track a `when` timestamp internally
// (queryCache.getEntries()[0].when), but the entry object is created via
// markRaw() — reactivity is deliberately skipped there for cache performance, so
// reading it in a computed would never trigger a re-render. Tracking our own
// timestamp off the query's public (reactive) isLoading/status refs avoids
// depending on that non-reactive internal.
export function useQueryFreshness(isLoading: Ref<boolean>, status: Ref<DataStateStatus>) {
  const lastUpdatedAt = ref<Date | null>(null)

  watch(isLoading, (loading, wasLoading) => {
    if (!loading && wasLoading && status.value === 'success') {
      lastUpdatedAt.value = new Date()
    }
  })

  // Data already sitting in the cache when this runs (e.g. a second page reusing
  // the same query key) never fires the transition above — Colada doesn't expose
  // exactly when it was fetched without reading the raw internals mentioned above,
  // so "now" is treated as close enough rather than left blank.
  if (!isLoading.value && status.value === 'success' && !lastUpdatedAt.value) {
    lastUpdatedAt.value = new Date()
  }

  return { lastUpdatedAt }
}
