// app\composables\commanders\useCommanderCatalogMutations.ts
// Triggers the Scryfall resync job then refetches the cached catalog query
// so newly-added commanders show up immediately without waiting for the
// 30-day cache expiry — same "Aggiorna elenco carte" button behavior as
// MagicTheGathering/league's own CommanderModal (user request, 2026-09-16).
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
    onSettled: () => queryCache.invalidateQueries({ key: COMMANDER_CATALOG_KEY })
  })

  return { syncCatalog }
}
