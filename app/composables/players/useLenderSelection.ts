// app\composables\players\useLenderSelection.ts
// Shared borrowed-deck/lender-picker state used by DeckCreateModal and
// DeckEditModal — ported from league's composables/deck/useLenderSelection.ts
// (user request, 2026-09-17), uuid-based instead of numeric player ids.
export function useLenderSelection(playerUuid: () => string | undefined) {
  const { data: players } = usePlayersQuery()

  const isBorrowed = ref(false)
  const lenderUuid = ref<string | undefined>(undefined)

  const lenderOptions = computed(() =>
    (players.value ?? [])
      .filter(p => p.uuid !== playerUuid())
      .map(p => ({
        label: `${p.first_name} ${p.last_name}`,
        value: p.uuid
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  )

  return { isBorrowed, lenderUuid, lenderOptions }
}
