// app\composables\players\usePlayerDeckMutations.ts
// Manual deck create/update/delete — restores league's DeckCreateModal/
// DeckEditModal flow (user request, 2026-09-17), separate from
// useCommanderDeckBracketMutation.ts (already wired into
// CommanderDecksCard.vue's bracket column) and from the round-time
// get-or-create in server/api/commander-decks/select.post.ts. Named
// differently from tournaments/useCommanderDecksMutations.ts (an unrelated
// "select a commander for a round" composable) to avoid a global
// auto-import name collision — Nuxt's composable auto-import is flat, not
// folder-scoped, unlike component auto-import.
export interface CreateDeckPayload {
  playerUuid: string
  commander1Name: string
  commander2Name: string | null
  companionName: string | null
  decklistUrl: string | null
  isBorrowed: boolean
  lenderUuid: string | null
}

export interface UpdateDeckPayload {
  deckUuid: string
  companionName: string | null
  decklistUrl: string | null
  isBorrowed: boolean
  lenderUuid: string | null
}

export function usePlayerDeckMutations(playerUuid: MaybeRefOrGetter<string | undefined>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const { t } = useI18n()

  function invalidateDecks() {
    queryCache.invalidateQueries({ key: ['commander-decks', toValue(playerUuid) ?? ''] })
  }

  const createDeck = useMutation({
    mutation: (payload: CreateDeckPayload) =>
      $fetch('/api/commander-decks/create', { method: 'POST', body: payload }),
    onError: (error) => {
      toast.add({
        title: t('player.commander.deckSaveError'),
        description: toErrorMessage(error),
        color: 'error'
      })
    },
    onSettled: invalidateDecks
  })

  const updateDeck = useMutation({
    mutation: (payload: UpdateDeckPayload) =>
      $fetch('/api/commander-decks/update', { method: 'POST', body: payload }),
    onError: (error) => {
      toast.add({
        title: t('player.commander.deckSaveError'),
        description: toErrorMessage(error),
        color: 'error'
      })
    },
    onSettled: invalidateDecks
  })

  const deleteDeck = useMutation({
    mutation: (payload: { deckUuid: string }) =>
      $fetch('/api/commander-decks/delete', { method: 'POST', body: payload }),
    onError: (error) => {
      toast.add({
        title: t('player.commander.deckDeleteError'),
        description: toErrorMessage(error),
        color: 'error'
      })
    },
    onSettled: invalidateDecks
  })

  return { createDeck, updateDeck, deleteDeck }
}
