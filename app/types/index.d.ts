import type { AvatarProps } from '@nuxt/ui'

export type UserStatus = 'subscribed' | 'unsubscribed' | 'bounced'
export type SaleStatus = 'paid' | 'failed' | 'refunded'

export type RequestStatus = 'accepted' | 'pending' | 'rejected'
export type AssociateType = 'ordinario' | 'sostenitore'

export type TournamentStatus = 'scheduled' | 'canceled' | 'ongoing' | 'completed'

export interface Associate {
  id: number
  uuid: string

  created_at: string
  updated_at: string
  updated_by: string

  request_status: RequestStatus
  request_date: string
  payment_date: string

  association_date: string | null
  associate_type: AssociateType | null
  pauperwave_associate_number: string | null

  consent_data: boolean
  consent_social: boolean
  has_read_statute: boolean
  has_acknowledged_surveillance_notice: boolean

  avatar?: AvatarProps

  first_name: string
  last_name: string
  email_address: string
  phone_number: string | null
  tax_code: string | null

  born_date: string
  born_location?: string | null
  born_province?: string | null
  born_state: string

  residency_address: string
  residency_house_number?: string | null
  residency_city: string
  residency_province: string
  residency_cap: string

  mtgo_nickname: string
  mtga_nickname: string
}

export type TransactionStatus = 'paid' | 'failed' | 'refunded'

export interface Transaction {
  id: number
  amount: number
  date: string
  status: TransactionStatus
  associate: Associate
}

export interface Mail {
  id: number
  unread?: boolean
  from: User
  subject: string
  body: string
  date: string
}

export interface Member {
  name: string
  username: string
  role: 'member' | 'owner'
  avatar: AvatarProps
}

export interface Stat {
  title: string
  icon: string
  value: number | string
  variation: number
  formatter?: (value: number) => string
}

export interface Sale {
  id: string
  date: string
  status: SaleStatus
  email: string
  amount: number
}

export interface Notification {
  id: number
  unread?: boolean
  sender: User
  body: string
  date: string
}

export type Period = 'daily' | 'weekly' | 'monthly'

export interface Range {
  start: Date
  end: Date
}
