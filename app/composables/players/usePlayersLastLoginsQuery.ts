// app\composables\players\usePlayersLastLoginsQuery.ts
import type { PlayerLastLogin } from '#shared/types/players'

export const PLAYERS_LAST_LOGINS_KEY = ['players-last-logins']

// Separate query, not folded into usePlayersQuery.ts's players_full read —
// last_sign_in_at lives in auth.users, unreachable via PostgREST/RLS, so it
// has to come from a server endpoint ($fetch), not a direct Supabase client
// query like every other players_full field. Same "own key, joined
// client-side" shape as useAssociatesGeocodesQuery.ts.
//
// useRequestFetch(), not the global $fetch: a direct/SSR navigation to
// /players/[slug] renders this composable on the server, where plain $fetch
// doesn't forward the incoming request's auth cookies to this app's own API
// route — requireManagementPermission then sees no session and 401s, even
// though the visitor is genuinely logged in (reproduced 2026-08-20 hitting
// this page via a fresh navigation). useRequestFetch() forwards those
// headers server-side and is a no-op wrapper around $fetch on the client.
export function usePlayersLastLoginsQuery() {
  const requestFetch = useRequestFetch()

  return useQuery({
    key: PLAYERS_LAST_LOGINS_KEY,
    query: () => requestFetch<PlayerLastLogin[]>('/api/players/last-logins')
  })
}
