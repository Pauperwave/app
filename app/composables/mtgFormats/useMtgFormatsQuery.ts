// app\composables\mtgFormats\useMtgFormatsQuery.ts
// Read-only lookup, reused across every domain's AddModal that needs to pick
// a format (tournaments today, leagues once that migrates too). Excludes
// soft-deleted rows (deleted_at) — a deleted format shouldn't be pickable
// for new tournaments, but tournaments/useTournamentsQuery.ts's own
// format:mtg_formats(name) join deliberately does NOT filter on it, so a
// past tournament keeps showing the format it was actually played under.
export const MTG_FORMATS_KEY = ['mtg-formats']

export function useMtgFormatsQuery() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: MTG_FORMATS_KEY,
    query: async () => {
      const { data, error } = await supabase
        .from('mtg_formats')
        .select('id, uuid, name, color')
        .is('deleted_at', null)
        .order('name', { ascending: true })

      if (error) throw error
      return data
    }
  })
}
