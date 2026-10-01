// shared\utils\commanders\commanderPartnerRules.ts
// Which cards are legal as a player's SECOND commander (partner mechanics and Backgrounds), derived
// from the commander catalog. Lives in shared/ so the website's commander modal and the Telegram
// bot apply exactly the same rules (extracted from useCommanderWhitelists.ts, 2026-10-01).
//
// Known gap, kept as it was on the site (and in league): `partner_group` and `doctor` are valid
// partner_type values the sync job can produce, but they have no whitelist here, so such a card
// reports a non-'commander' type while getAllowedPartners returns an empty list.
export interface PartnerRuleCard {
  name: string
  scryfallId: string
  partnerType: string | null
  keywords: string[]
  partnerWithScryfallId: string | null
}

export function createPartnerRules(catalog: readonly PartnerRuleCard[]) {
  const whitelists = {
    commander: [] as string[],
    partner: [] as string[],
    partnerWith: [] as string[],
    // True Background enchantment cards — valid second commander for a background_commander.
    background: [] as string[],
    // Creatures with "Choose a Background": they need an actual Background as second commander,
    // NOT another background-choosing creature, so this stays a separate list from `background`.
    backgroundCommander: [] as string[],
    doctorsCompanion: [] as string[],
    companion: [] as string[],
    friendForever: [] as string[]
  }

  for (const row of catalog) {
    whitelists.commander.push(row.name)

    switch (row.partnerType) {
      case 'partner':
        whitelists.partner.push(row.name)
        break
      case 'partner_with':
        whitelists.partnerWith.push(row.name)
        break
      case 'background':
        whitelists.background.push(row.name)
        break
      case 'background_commander':
        whitelists.backgroundCommander.push(row.name)
        break
      case 'doctors_companion':
        whitelists.doctorsCompanion.push(row.name)
        break
      case 'friends_forever':
        whitelists.friendForever.push(row.name)
        break
    }

    if (row.keywords.includes('Companion')) whitelists.companion.push(row.name)
  }

  const partnerTypeByName = new Map(catalog.map(row => [row.name, row.partnerType || 'commander']))
  const partnerWithScryfallIdByName = new Map(
    catalog.map(row => [row.name, row.partnerWithScryfallId])
  )
  const nameByScryfallId = new Map(catalog.map(row => [row.scryfallId, row.name]))

  function getPartnerType(cardName: string): string {
    return partnerTypeByName.get(cardName) || 'commander'
  }

  // For a "partner_with" commander, its one exact named partner; null otherwise (or if unresolved).
  function getExactPartnerName(cardName: string): string | null {
    if (getPartnerType(cardName) !== 'partner_with') return null
    const partnerScryfallId = partnerWithScryfallIdByName.get(cardName)
    if (!partnerScryfallId) return null
    return nameByScryfallId.get(partnerScryfallId) ?? null
  }

  // The legal second commanders for `commander1Name` — empty if it can't have one.
  function getAllowedPartners(commander1Name: string): string[] {
    switch (getPartnerType(commander1Name)) {
      case 'partner':
        return [...whitelists.partner]
      case 'partner_with':
        // Stays broad (every partner_with card) so a manual override is still possible.
        return [...whitelists.partnerWith]
      case 'background_commander':
        return [...whitelists.background]
      case 'background':
        return [...whitelists.backgroundCommander]
      case 'friends_forever':
        return [...whitelists.friendForever]
      case 'doctors_companion':
        return [...whitelists.doctorsCompanion]
      case 'companion':
        return [...whitelists.companion]
      default:
        return []
    }
  }

  return { whitelists, getPartnerType, getExactPartnerName, getAllowedPartners }
}
