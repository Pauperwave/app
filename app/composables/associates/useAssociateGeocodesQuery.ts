// app\composables\associates\useAssociateGeocodesQuery.ts
export interface AssociateGeocode {
  associate_uuid: string
  latitude: number
  longitude: number
}

export const ASSOCIATE_GEOCODES_KEY = ['associate-geocodes']

export function useAssociateGeocodesQuery() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: ASSOCIATE_GEOCODES_KEY,
    query: async (): Promise<AssociateGeocode[]> => {
      const { data, error } = await supabase
        .from('pauperwave_associate_geocodes')
        .select('associate_uuid, latitude, longitude')

      if (error) throw error
      return (data ?? []) as AssociateGeocode[]
    }
  })
}
