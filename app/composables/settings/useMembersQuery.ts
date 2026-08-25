// app\composables\settings\useMembersQuery.ts
import type { Member } from '#shared/types/settings'

export const MEMBERS_KEY = ['settings-members']

// BFF read via $fetch, not a direct client query like useSettingsQuery.ts —
// see server/api/settings/members.get.ts's own comment for why (user_roles'
// RLS can't be read for other users at anything below super_admin).
// useRequestFetch(), not the global $fetch — same SSR auth-cookie-forwarding
// reasoning as usePlayersLastLoginsQuery.ts, this page can render on a fresh
// navigation where plain $fetch wouldn't forward the session cookie.
export function useMembersQuery() {
  const requestFetch = useRequestFetch()

  return useQuery({
    key: MEMBERS_KEY,
    query: () => requestFetch<Member[]>('/api/settings/members')
  })
}
