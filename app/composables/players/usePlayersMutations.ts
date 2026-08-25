// app\composables\players\usePlayersMutations.ts
// First mutation for the /players domain (previously read-only, see
// usePlayersQuery.ts's own comment) — same BFF pattern as
// useTransactionsMutations.ts's deleteTransaction.
export function usePlayersMutations() {
  const queryCache = useQueryCache()

  const deletePlayer = useMutation({
    mutation: (id: number) => $fetch(`/api/players/${id}/delete`, { method: 'POST' }),
    onSettled: () => queryCache.invalidateQueries({ key: PLAYERS_KEY })
  })

  return { deletePlayer }
}
