// app\composables\commanders\useCommanderWhitelists.ts
// Ported from MagicTheGathering/league (user request, 2026-09-16) — decides
// which cards are legal as a player's SECOND commander (partner mechanics
// and Backgrounds), derived from the cached catalog.
//
// Known gap, ported as-is (league itself never closed it): `partner_group`
// and `doctor` are valid partner_type values Scryfall/the sync job can
// produce, but neither the bucketing switch below nor getAllowedPartners
// has a case for them — a card with one of these types reports
// canHaveCommander2 = true (its type isn't 'commander') but the whitelist
// falls through to an empty array, so the commander2 search box renders
// enabled with zero results and no explanation. Not fixed here, same as
// league — flagging so a future "why is commander2 empty" report doesn't
// have to re-derive this.
export function useCommanderWhitelists() {
  const { data: catalog, isLoading, refetch } = useCommanderCatalogQuery()

  const whitelists = computed(() => {
    const result = {
      commander: [] as string[],
      partner: [] as string[],
      partnerWith: [] as string[],
      // True Background enchantment cards (e.g. "Candlekeep Sage") — valid
      // commander2 options for a background_commander commander1.
      background: [] as string[],
      // Legendary creatures with "Choose a Background" (e.g. "Jaheira,
      // Friend of the Forest") — need an actual Background as their second
      // commander, NOT another background-choosing creature. Kept in a
      // separate array from `background` on purpose: merging both into one
      // list (a real bug league fixed) would incorrectly let two
      // background-choosing creatures pair with each other.
      backgroundCommander: [] as string[],
      doctorsCompanion: [] as string[],
      companion: [] as string[],
      friendForever: [] as string[]
    }

    for (const row of catalog.value ?? []) {
      result.commander.push(row.name)

      switch (row.partnerType) {
        case 'partner':
          result.partner.push(row.name)
          break
        case 'partner_with':
          result.partnerWith.push(row.name)
          break
        case 'background':
          result.background.push(row.name)
          break
        case 'background_commander':
          result.backgroundCommander.push(row.name)
          break
        case 'doctors_companion':
          result.doctorsCompanion.push(row.name)
          break
        case 'friends_forever':
          result.friendForever.push(row.name)
          break
      }

      if (row.keywords.includes('Companion')) {
        result.companion.push(row.name)
      }
    }

    return result
  })

  const partnerTypeByName = computed(() => {
    const map = new Map<string, string>()
    for (const row of catalog.value ?? []) map.set(row.name, row.partnerType || 'commander')
    return map
  })

  // name -> its own partnerWithScryfallId, and scryfallId -> name — together
  // resolve a partner_with commander's exact partner entirely from the
  // already-cached catalog (no DB round-trip). See getExactPartnerName.
  const partnerWithScryfallIdByName = computed(() => {
    const map = new Map<string, string | null>()
    for (const row of catalog.value ?? []) map.set(row.name, row.partnerWithScryfallId)
    return map
  })

  const nameByScryfallId = computed(() => {
    const map = new Map<string, string>()
    for (const row of catalog.value ?? []) map.set(row.scryfallId, row.name)
    return map
  })

  function getPartnerType(cardName: string): string {
    return partnerTypeByName.value.get(cardName) || 'commander'
  }

  /**
   * For a "partner_with" commander, resolves the exact named partner (e.g.
   * "Cazur, Ruthless Stalker" → "Ukkima, Stalking Shadow") from the cached
   * catalog. Returns null if `cardName` isn't partner_with, or its partner
   * scryfall id doesn't (yet) resolve to a cached row.
   */
  function getExactPartnerName(cardName: string): string | null {
    if (getPartnerType(cardName) !== 'partner_with') return null
    const partnerScryfallId = partnerWithScryfallIdByName.value.get(cardName)
    if (!partnerScryfallId) return null
    return nameByScryfallId.value.get(partnerScryfallId) ?? null
  }

  /** Given a commander1 name, the list of allowed commander2 names — empty
   * if commander1 can't have a partner. */
  function getAllowedPartners(commander1Name: string): string[] {
    const type = getPartnerType(commander1Name)

    switch (type) {
      case 'partner':
        return [...whitelists.value.partner]
      case 'partner_with':
        // Stays broad (every partner_with card) so a manual override is
        // still possible — the modal auto-fills the one exact match via
        // getExactPartnerName instead of narrowing here.
        return [...whitelists.value.partnerWith]
      case 'background_commander':
        return [...whitelists.value.background]
      case 'background':
        return [...whitelists.value.backgroundCommander]
      case 'friends_forever':
        return [...whitelists.value.friendForever]
      case 'doctors_companion':
        return [...whitelists.value.doctorsCompanion]
      case 'companion':
        return [...whitelists.value.companion]
      case 'commander':
      default:
        return []
    }
  }

  return {
    whitelists, isLoading, refetch, getPartnerType, getAllowedPartners, getExactPartnerName
  }
}
