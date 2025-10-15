export interface Associate {
  id: number
  uuid: string
  created_at: string
  updated_at: string
  request_date: string
  status: string
  association_date: string | null
  pauperwave_associate_number: string | null
  consent_data: boolean
  consent_social: boolean
  has_read_statute: boolean
  has_acknowledged_surveillance_notice: boolean
  associate_type: 'ordinario' | 'sostenitore'
  tax_code: string | null
  first_name: string
  last_name: string
  email_address: string
  phone_number: string | null
  born_date: string
  born_location: string | null
  born_province: string | null
  born_state: string
  residency_address: string
  residency_house_number: string | null
  residency_city: string
  residency_province: string
  residency_cap: string
  mtgo_nickname: string
  mtga_nickname: string
}
