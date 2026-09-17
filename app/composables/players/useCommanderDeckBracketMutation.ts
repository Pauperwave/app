// app\composables\players\useCommanderDeckBracketMutation.ts
// Sets a deck's power-level "Bracket" rating — pairs with
// BracketPickerModal.vue on CommanderDecksCard.vue's own table (user
// request 2026-09-16: copy league's bracket system, adapted to this app).
export function useCommanderDeckBracketMutation(playerUuid: MaybeRefOrGetter<string | undefined>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const { t } = useI18n()

  const setBracket = useMutation({
    mutation: (payload: { deckUuid: string, bracketLevel: number }) =>
      $fetch('/api/commander-decks/set-bracket', { method: 'POST', body: payload }),
    onError: (error) => {
      toast.add({
        title: t('player.deckBracket.saveError'),
        description: toErrorMessage(error),
        color: 'error'
      })
    },
    onSettled: () => {
      queryCache.invalidateQueries({ key: ['commander-decks', toValue(playerUuid) ?? ''] })
    }
  })

  return { setBracket }
}
