// app\composables\players\usePlayersLastLoginsQuery.ts
import type { PlayerLastLogin } from '#shared/types/players'

export const PLAYERS_LAST_LOGINS_KEY = ['players-last-logins']

// Separate from usePlayersQuery.ts's players_full read: last_sign_in_at lives in auth.users
// (unreachable via PostgREST/RLS), so it needs a server endpoint ($fetch), not a direct Supabase
// query. Same "own key, joined client-side" shape as useAssociatesGeocodesQuery.ts.
//
// useRequestFetch(), not the global $fetch: on a direct/SSR navigation to /players/[slug] plain
// $fetch doesn't forward the request's auth cookies to this app's API route, so
// requireManagementPermission sees no session and 401s. useRequestFetch() forwards them server-side
// and is a no-op wrapper around $fetch on the client.
export function usePlayersLastLoginsQuery() {
  const requestFetch = useRequestFetch()

  return useQuery({
    key: PLAYERS_LAST_LOGINS_KEY,
    query: () => requestFetch<PlayerLastLogin[]>('/api/players/last-logins')
  })
}
