// app\composables\useAssociateGeocodes.ts
export interface AssociateGeocode {
  associate_uuid: string
  latitude: number
  longitude: number
}

export const useAssociateGeocodes = () => {
  const supabase = useSupabaseClient()

  const {
    data: geocodes, pending: loading, error, refresh
  } = useAsyncData(
    'associate-geocodes',
    async () => {
      const { data, error: supabaseError } = await supabase
        .from('pauperwave_associate_geocodes')
        .select('associate_uuid, latitude, longitude')

      if (supabaseError) {
        throw createError({
          statusCode: 500,
          message: supabaseError.message
        })
      }

      return (data ?? []) as AssociateGeocode[]
    },
    {
      default: () => [],
      lazy: true
    }
  )

  return { geocodes, loading, error, refresh }
}
