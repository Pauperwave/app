// app\composables\locations\useAddressGeocode.ts
// Debounced client-side geocoding for the location form's live map preview
// (2026-08-16, replacing the Google "output=embed" iframe hack — see
// MapPreview.vue). Photon (komoot.io) rather than Nominatim: already the
// geocoder this codebase uses for associates (scripts/geocode-associates.mjs),
// free, no API key. Called directly from the client like Scryfall in
// useScryfallCardSearch.ts — Photon is a public read-only API, no secret to
// keep server-side, and browsers ignore a custom User-Agent header anyway.
interface PhotonResponse {
  features: { geometry: { coordinates: [number, number] } }[]
}

export function useAddressGeocode(address: Ref<string>) {
  const coords = ref<[number, number] | null>(null)
  const isGeocoding = ref(false)

  async function geocode(query: string) {
    if (query.trim().length < 5) {
      coords.value = null
      return
    }

    isGeocoding.value = true
    try {
      const response = await $fetch<PhotonResponse>('https://photon.komoot.io/api/', {
        query: { q: query, limit: 1 }
      })
      const [lon, lat] = response.features[0]?.geometry.coordinates ?? []
      coords.value = lat !== undefined && lon !== undefined ? [lat, lon] : null
    } catch {
      // Geocoding is best-effort for a live preview — a failed lookup just
      // hides the map, same as an address that hasn't resolved yet.
      coords.value = null
    } finally {
      isGeocoding.value = false
    }
  }

  const debouncedGeocode = useDebounceFn(geocode, 600)
  watch(address, q => debouncedGeocode(q), { immediate: true })

  return { coords, isGeocoding }
}
