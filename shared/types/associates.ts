// shared\types\associates.ts

// Shared by app/components/associates/list/EditModal.vue,
// server/api/associates/[id]/update.post.ts, and apply.post.ts — same shape
// as associateFormSchema's output (snake_case, matching the DB columns 1:1),
// just with born_date as an ISO string instead of a Date (the wire format).
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
}
