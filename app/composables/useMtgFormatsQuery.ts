// app\composables\useMtgFormatsQuery.ts
// Read-only lookup, reused across every domain's AddModal that needs to pick
// a format (tournaments today, leagues once that migrates too).
export const MTG_FORMATS_KEY = ['mtg-formats']

export function useMtgFormatsQuery() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: MTG_FORMATS_KEY,
    query: async () => {
      const { data, error } = await supabase
        .from('mtg_formats')
        .select('id, uuid, name, description')
        .order('name', { ascending: true })

      if (error) throw error
      return data
    }
  })
}
