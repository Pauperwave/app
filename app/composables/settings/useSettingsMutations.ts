// app\composables\settings\useSettingsMutations.ts
import type { UpdateMembershipFeePayload } from '#shared/types/settings'

export function useSettingsMutations() {
  const queryCache = useQueryCache()

  // Same BFF convention as useWantedCardsMutations.ts — the server/api
  // endpoint (holding the service-role key) is the authorization boundary
  // (requireAdminPermission, server/utils/serverAuth.ts), not RLS evaluated
  // from the client.
  const updateMembershipFee = useMutation({
    mutation: (payload: UpdateMembershipFeePayload) =>
      $fetch('/api/settings/update-membership-fee', { method: 'POST', body: payload }),
    onSettled: () => queryCache.invalidateQueries({ key: SETTINGS_KEY })
  })

  return { updateMembershipFee }
}
