// app\composables\associates\useAssociateRenewalsQuery.ts
// Full renewal history (one row per associate per renewal year), not just the latest year the
// associates view exposes: needed to reconstruct an associate's membership_status at a past point
// in time (see useAssociatesStatistics.ts's statusOverTimeSeries)
export interface AssociateRenewal {
  associateUuid: string
  renewalYear: number
  renewalDate: string
}

export const ASSOCIATE_RENEWALS_KEY = ['associate-renewals']

// RLS on pauperwave_associate_renewals (docs/supabase/3-RLS-policies.md) lets only staff
// (has_management_permissions) select every row; a player sees their own. Gated on isStaff so a
// non-staff viewer of /statistics gets an empty result instead of a chart that looks right but
// misses almost everyone
export function useAssociateRenewalsQuery() {
  const supabase = useSupabaseClient()
  const { isStaff } = useUserRole()

  return useQuery({
    key: ASSOCIATE_RENEWALS_KEY,
    enabled: () => isStaff.value,
    query: async (): Promise<AssociateRenewal[]> => {
      const fetchPage = (from: number, to: number) => supabase
        .from('pauperwave_associate_renewals')
        .select('associate_uuid, renewal_year, renewal_date')
        .range(from, to)

      const data = await fetchAllRows(fetchPage)

      return data.map(row => ({
        associateUuid: row.associate_uuid,
        renewalYear: row.renewal_year,
        renewalDate: row.renewal_date
      }))
    }
  })
}
