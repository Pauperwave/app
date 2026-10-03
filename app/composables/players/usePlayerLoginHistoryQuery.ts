// app\composables\players\usePlayerLoginHistoryQuery.ts
// Direct client read, RLS-gated (has_management_permissions, like the /players page). Unlike
// last-logins.get.ts it needs no admin API: player_login_history is a real public.* table populated
// by a trigger on auth.audit_log_entries (migration 20260820100000)
export function usePlayerLoginHistoryQuery(userId: Ref<string | null | undefined>) {
  const supabase = useSupabaseClient()

  return useQuery({
    key: () => ['player-login-history', userId.value ?? ''],
    enabled: () => !!userId.value,
    query: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('player_login_history')
        .select('logged_in_at')
        .eq('user_id', userId.value!)
        .order('logged_in_at', { ascending: false })
        .limit(50)

      if (error) throw error

      return data.map(row => row.logged_in_at)
    }
  })
}
