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
      // PostgREST's silent row cap (see fetchAllRows.ts): a bare .select() left the map/roster
      // missing (total - cap) geocodes once the table crossed it
      const fetchPage = (from: number, to: number) => supabase
        .from('pauperwave_associate_geocodes')
        .select('associate_uuid, latitude, longitude')
        .range(from, to)

      return fetchAllRows(fetchPage) as Promise<AssociateGeocode[]>
    }
  })
}
