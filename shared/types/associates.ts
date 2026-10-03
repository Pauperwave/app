// shared\types\associates.ts

// Rows in pauperwave_associate_membership_events: the 4 lifecycle moments that would
// otherwise be overwritten on pauperwave_associates' single mutable row.
export type MembershipEventType = 'requested' | 'approved' | 'renewal_requested' | 'renewal_approved'

// Shared by associates/list/EditModal.vue and the associates update/apply endpoints: the
// associateFormSchema output (snake_case, 1:1 with the DB columns) with born_date as an ISO string.
export interface AssociateEditsPayload {
  associate_type: 'regular' | 'sustaining'
  first_name: string
  last_name: string
  email_address: string
  phone_number: string
  tax_code: string
  born_location: string
  born_date: string
  born_province: string
  born_state: string
  residency_address: string
  residency_house_number: string | null
  residency_city: string
  residency_province: string
  residency_cap: string
  consent_data: boolean
  consent_social: boolean
  has_read_statute: boolean
  // Only sent by the staff edit form; the public application never sets it.
  has_no_telegram?: boolean
}
