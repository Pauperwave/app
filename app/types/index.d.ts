// app\types\index.d.ts
import type { AvatarProps } from '@nuxt/ui'
import type { Database } from '#shared/utils/types/database'

export type UserStatus = 'subscribed' | 'unsubscribed' | 'bounced'
export type SaleStatus = 'paid' | 'failed' | 'refunded'

export type RequestStatus = 'approved' | 'pending' | 'rejected'
export type AssociateType = 'ordinario' | 'sostenitore'

// Stato di tesseramento calcolato dalla view pauperwave_associates_with_status
// (mai salvato a DB): 'active'/'to_renew'/'expired' derivano dall'ultimo anno di
// rinnovo in pauperwave_associate_renewals; per le richieste non ancora approvate
// coincide con membership_request_status ('pending'/'rejected').
export type MembershipStatus = RequestStatus | 'active' | 'to_renew' | 'expired'

export type TournamentStatus = 'scheduled' | 'canceled' | 'ongoing' | 'completed'

type AssociateRow = Database['public']['Tables']['pauperwave_associates']['Row']

// Deriva da shared/utils/types/database.ts (generato da Supabase) così un rename/rimozione di
// colonna produce un errore di compilazione invece di un bug silenzioso a runtime.
export interface Associate extends Omit<AssociateRow, 'membership_request_status' | 'associate_type'> {
  membership_request_status: RequestStatus
  associate_type: AssociateType | null
  membership_status: MembershipStatus
  latest_renewal_year: number | null
  avatar?: AvatarProps
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
