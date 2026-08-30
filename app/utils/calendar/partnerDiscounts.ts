// app\utils\calendar\partnerDiscounts.ts
// Static list for /calendario's "sconti partner" section (CalendarPartnerDiscounts.vue),
// same mock/static convention as server/api/members.ts — revisit as a Supabase table
// (with its own use<Domain>Query.ts) once the list grows past a handful of hand-edited entries.
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
