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

// "searching" = in cerca, "found" = trovata, "abandoned" = il giocatore non
// la cerca più (senza averla trovata) — tre stati distinti, non un booleano:
// "trovata" e "non cerco più" hanno esiti opposti per le statistiche.
export type WantedCardStatus = 'searching' | 'found' | 'abandoned'

// Colonne snake_case di pauperwave_wanted_cards mappate su questa interfaccia
// camelCase in useWantedCards.ts. Condiviso tra wanted-cards/index.vue e i
// suoi componenti (tabella, griglia, modali) così tutte le viste operano
// sullo stesso tipo.
export interface WantedCard {
  id: number
  date: string
  status: WantedCardStatus
  // Impostato da un trigger DB quando status passa a "found" (null altrimenti)
  // — vedi migrazioni 20260807230702/20260807231803. Serve a statistiche come
  // "tempo medio per trovare una carta" (date/foundAt), non ancora mostrato
  // in UI.
  foundAt: string | null
  cardName: string
  scryfallUrl: string
  // Null per le richieste create prima della migrazione 20260808120000 —
  // servono per risolvere il link diretto CardTrader (server/utils/
  // cardTrader.ts), non hanno un default retroattivo affidabile.
  scryfallId: string | null
  setCode: string | null
  copies: number
  language: string
  treatment: string[]
  manaCost: string
  colorIdentity: string[]
  cmc: number
  imageUrl: string
  // Due fonti di prezzo distinte, non ricalcolate a ogni lettura — snapshot
  // aggiornati da un refresh manuale o dal job settimanale (vedi
  // server/utils/priceRefresh.ts, scripts/refresh-wanted-cards-prices.mjs).
  // *SyncedAt è null finché non è mai stato eseguito un refresh sulla riga.
  cardmarketPrice: number | null
  cardmarketPriceSyncedAt: string | null
  cardtraderPrice: number | null
  cardtraderPriceSyncedAt: string | null
  notes: string
  player: string
  playerAssociateUuid: string
}
