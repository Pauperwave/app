// app\utils\calendar\partnerDiscounts.ts
// Static list for /calendario's "sconti partner" section (CalendarPartnerDiscounts.vue), a
// mock/static convention like server/api/members.ts: move to a Supabase table (with its own
// use<Domain>Query.ts) once it outgrows a few hand-edited entries
export interface PartnerDiscount {
  partner: string
  code: string
  description: string
  url?: string
}

export const PARTNER_DISCOUNTS: PartnerDiscount[] = [
  {
    partner: 'Card Game Corner',
    code: 'PW2026',
    description: '5% di sconto su tutto il sito online',
    url: 'https://www.cardgamecorner.com/'
  },
  {
    partner: 'Card Game Corner',
    code: 'WAVE2026',
    description: '10% di sconto su tutto il sito online',
    url: 'https://www.cardgamecorner.com/'
  }
]
