// app\composables\commanders\useCommanderStatsQuery.ts
// Global aggregate stats per commander (pair) from the `commander_stats` view (migration
// 20260919040000), ported from league's useCommanderStats.ts. league's is a MATERIALIZED view
// needing a manual refresh; this app's is a plain (always live) view, so there is no
// single-commander query variant: useCommanderAggregate.ts filters this list client-side
export interface CommanderStatsPair {
  commander1Name: string
  commander2Name: string | null
  playerCount: number
  matchCount: number
  winCount: number
  totalKills: number
  averageScore: number
}

export const ALL_COMMANDER_STATS_KEY = ['all-commander-stats']

export function useAllCommanderStats() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: ALL_COMMANDER_STATS_KEY,
    query: async (): Promise<CommanderStatsPair[]> => {
      const { data, error } = await supabase.from('commander_stats').select('*')
      if (error) throw error

      return (data ?? [])
        .filter((row): row is typeof row & { commander_1_name: string } => !!row.commander_1_name)
        .map(row => ({
          commander1Name: row.commander_1_name,
          commander2Name: row.commander_2_name,
          playerCount: row.player_count ?? 0,
          matchCount: row.match_count ?? 0,
          winCount: row.win_count ?? 0,
          totalKills: row.total_kills ?? 0,
          averageScore: row.average_score ?? 0
        }))
    }
  })
}
