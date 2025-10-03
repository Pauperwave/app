import type { AvatarProps } from '@nuxt/ui'

export type UserStatus = 'subscribed' | 'unsubscribed' | 'bounced'
export type SaleStatus = 'paid' | 'failed' | 'refunded'

export interface User {
  associate_type?: 'Ordinario' | 'Sostenitore'
  association_date?: string | null
  avatar?: AvatarProps
  born_date?: Date
  born_location?: string
  born_province?: string
  born_state?: string
  consent_data?: boolean
  consent_social?: boolean
  email: string
  has_acknowledged_surveillance_notice?: boolean
  has_read_statute?: boolean
  id: number
  location?: string
  mtga_nickname?: string | null
  mtgo_nickname?: string | null
  name: string
  pauperwave_associate_number?: number | null
  phone_number?: string
  request_date?: string
  residency_address?: string
  residency_cap?: string
  residency_city?: string
  residency_province?: string
  status?: UserStatus
  surname?: string
  tax_code?: string | null
  uuid?: string
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
