// app\composables\commanders\useCommanderCatalogMutations.ts
// Triggers the Scryfall resync job then refetches the cached catalog query, so new commanders show
// up without waiting for the 30-day cache expiry (the "Aggiorna elenco carte" button, like league's
// CommanderModal). The by-name lookups behind the card images cache their misses too, so they are
// refetched with it.
export function useCommanderCatalogMutations() {
  const queryCache = useQueryCache()
  const toast = useToast()
  const { t } = useI18n()

  const syncCatalog = useMutation({
    mutation: () => $fetch<{ added: number, checked: number }>('/api/admin/sync-commanders', {
      method: 'POST'
    }),
    onSuccess: ({ added }) => {
      toast.add({
        title: added > 0
          ? t('tournament.single.commanderModal.syncSuccessWithNew', { count: added })
          : t('tournament.single.commanderModal.syncSuccessNoNew'),
        color: 'success'
      })
    },
    onError: (error) => {
      toast.add({
        title: t('tournament.single.commanderModal.syncErrorTitle'),
        description: toErrorMessage(error),
        color: 'error'
      })
    },
    onSettled: () => {
      queryCache.invalidateQueries({ key: COMMANDER_CATALOG_KEY })
      queryCache.invalidateQueries({ key: COMMANDERS_BY_NAMES_KEY })
      queryCache.invalidateQueries({ key: COMMANDER_CARD_KEY })
    }
  })

  return { syncCatalog }
}
