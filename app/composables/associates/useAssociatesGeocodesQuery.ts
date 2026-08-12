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
      const { data, error } = await supabase
        .from('pauperwave_associate_geocodes')
        .select('associate_uuid, latitude, longitude')

      if (error) throw error
      return (data ?? []) as AssociateGeocode[]
    }
  })
}
