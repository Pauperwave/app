// app\composables\associates\useAssociatesGeocodesQuery.ts
export interface AssociateGeocode {
  associate_uuid: string
  latitude: number
  longitude: number
}

export const ASSOCIATES_GEOCODES_KEY = ['associate-geocodes']

export function useAssociatesGeocodesQuery() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: ASSOCIATES_GEOCODES_KEY,
    query: async (): Promise<AssociateGeocode[]> => {
      // PostgREST's silent 250-row cap (see fetchAllRows.ts) — a bare
      // .select() here left the map/roster missing exactly (total - 250)
      // geocodes once the table crossed that threshold (bug, user report
      // 2026-08-27: "74 associati non ancora geolocalizzati" right after a
      // full geocode run that actually succeeded for all of them).
      const fetchPage = (from: number, to: number) => supabase
        .from('pauperwave_associate_geocodes')
        .select('associate_uuid, latitude, longitude')
        .range(from, to)

      return fetchAllRows(fetchPage) as Promise<AssociateGeocode[]>
    }
  })
}
