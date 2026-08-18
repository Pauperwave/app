// app\composables\associates\useAssociateRenewalsQuery.ts
// Full renewal history (one row per associate per renewal year), not just
// the latest year the associates view exposes — needed to reconstruct what
// an associate's membership_status *would have been* at a past point in
// time (see useAssociatesStatistics.ts's statusOverTimeSeries), which the
// view's own latest_renewal_year can't answer since it only ever reflects
// the most recent renewal, not the history leading up to it.
export interface AssociateRenewal {
  associateUuid: string
  renewalYear: number
}

export const ASSOCIATE_RENEWALS_KEY = ['associate-renewals']

// RLS on pauperwave_associate_renewals (docs/supabase/3-RLS-policies.md)
// only lets staff (organizer/admin/super_admin — has_management_permissions)
// select every row; a plain player only ever sees their own. Gated on
// isStaff so a non-staff viewer of /statistics gets an empty (not
// silently-partial) result instead of a chart that looks right but is
// missing almost everyone.
export function useAssociateRenewalsQuery() {
  const supabase = useSupabaseClient()
  const { isStaff } = useUserRole()

  return useQuery({
    key: ASSOCIATE_RENEWALS_KEY,
    enabled: () => isStaff.value,
    query: async (): Promise<AssociateRenewal[]> => {
      const { data, error } = await supabase
        .from('pauperwave_associate_renewals')
        .select('associate_uuid, renewal_year')

      if (error) throw error

      return (data ?? []).map(row => ({
        associateUuid: row.associate_uuid,
        renewalYear: row.renewal_year
      }))
    }
  })
}
