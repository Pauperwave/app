// app\composables\settings\useMembersQuery.ts
import type { Member } from '#shared/types/settings'

export const MEMBERS_KEY = ['settings-members']

// BFF read via $fetch, not a direct client query like useSettingsQuery.ts (see
// server/api/settings/members.get.ts: user_roles' RLS can't be read for other users below
// super_admin). useRequestFetch(), not the global $fetch, for the same SSR auth-cookie forwarding
// as usePlayersLastLoginsQuery.ts
export function useMembersQuery() {
  const requestFetch = useRequestFetch()

  return useQuery({
    key: MEMBERS_KEY,
    query: () => requestFetch<Member[]>('/api/settings/members')
  })
}
