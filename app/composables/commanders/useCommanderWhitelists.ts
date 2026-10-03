// app\composables\commanders\useCommanderWhitelists.ts
// Decides which cards are legal as a player's SECOND commander (partner mechanics and Backgrounds),
// derived from the cached catalog (ported from league). The rules live in
// shared/utils/commanders/commanderPartnerRules.ts (also used by the Telegram bot); this only feeds
// them the catalog
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
