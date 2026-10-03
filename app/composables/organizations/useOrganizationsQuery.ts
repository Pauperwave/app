// app\composables\organizations\useOrganizationsQuery.ts
// Read-only lookup reused by every domain's AddModal that picks an organizer (tournaments today,
// events/leagues once migrated)
export const ORGANIZATIONS_KEY = ['organizations']

export function useOrganizationsQuery() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: ORGANIZATIONS_KEY,
    query: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('uuid, name')
        .order('name', { ascending: true })

      if (error) throw error
      return data
    }
  })
}
