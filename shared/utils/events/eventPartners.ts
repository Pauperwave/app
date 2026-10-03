// shared\utils\events\eventPartners.ts
// An event's partners (collaborators, sponsors), as the event form edits them and the server saves
// them (event_partners, migration 20261003120000).
export const EVENT_PARTNER_ROLES = ['collaborator', 'sponsor'] as const
export type EventPartnerRole = typeof EVENT_PARTNER_ROLES[number]

export interface EventPartnerInput {
  name: string
  role: EventPartnerRole
  logoUrl: string | null
  linkUrl: string | null
}

// The form keeps blank rows around while the organizer types: before saving, rows without a name
// are dropped, texts are trimmed and empty links become null. The array order is the display order.
export function cleanEventPartners(partners: EventPartnerInput[]): EventPartnerInput[] {
  return partners
    .map(partner => ({
      name: partner.name.trim(),
      role: partner.role,
      logoUrl: partner.logoUrl?.trim() || null,
      linkUrl: partner.linkUrl?.trim() || null
    }))
    .filter(partner => partner.name !== '')
}

// Collaborators first, then sponsors, each group in the saved order.
export function groupEventPartners<T extends { role: EventPartnerRole }>(
  partners: T[]
): { role: EventPartnerRole, partners: T[] }[] {
  return EVENT_PARTNER_ROLES
    .map(role => ({ role, partners: partners.filter(partner => partner.role === role) }))
    .filter(group => group.partners.length > 0)
}
