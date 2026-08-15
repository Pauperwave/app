// app\composables\useLocationsQuery.ts
// Read-only lookup, reused across every domain's AddModal that needs to pick
// a venue (tournaments today, events/leagues once those migrate too) — same
// reasoning as useOrganizationsQuery.ts/useMtgFormatsQuery.ts.
export const LOCATIONS_KEY = ['locations']

export function useLocationsQuery() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: LOCATIONS_KEY,
    query: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('uuid, name, address, city, province, postal_code, country')
        .order('name', { ascending: true })

      if (error) throw error
      return data
    }
  })
}
