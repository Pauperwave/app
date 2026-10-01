// app\composables\commanders\useCommanderWhitelists.ts
// Ported from MagicTheGathering/league (user request, 2026-09-16) — decides
// which cards are legal as a player's SECOND commander (partner mechanics
// and Backgrounds), derived from the cached catalog. The rules themselves
// live in shared/utils/commanders/commanderPartnerRules.ts (also used by the
// Telegram bot); this only feeds them the cached catalog.
import { createPartnerRules } from '#shared/utils/commanders/commanderPartnerRules'

export function useCommanderWhitelists() {
  const { data: catalog, isLoading, refetch } = useCommanderCatalogQuery()

  const rules = computed(() => createPartnerRules(catalog.value ?? []))
  const whitelists = computed(() => rules.value.whitelists)

  const getPartnerType = (cardName: string) => rules.value.getPartnerType(cardName)
  const getExactPartnerName = (cardName: string) => rules.value.getExactPartnerName(cardName)
  const getAllowedPartners = (commander1Name: string) =>
    rules.value.getAllowedPartners(commander1Name)

  return {
    whitelists, isLoading, refetch, getPartnerType, getAllowedPartners, getExactPartnerName
  }
}
