// app\composables\useRulesetsQuery.ts
// Read-only lookup for leagues' AddModal — same convention as
// useLocationsQuery.ts/useOrganizationsQuery.ts/useMtgFormatsQuery.ts.
export const RULESETS_KEY = ['rulesets']

export function useRulesetsQuery() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: RULESETS_KEY,
    query: async () => {
      const { data, error } = await supabase
        .from('rulesets')
        .select('uuid, name')
        .order('name', { ascending: true })

      if (error) throw error
      return data
    }
  })
}
