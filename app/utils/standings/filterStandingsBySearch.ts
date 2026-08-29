// app\utils\standings\filterStandingsBySearch.ts
// Shared by every standings page (FormatPage.vue/PublicFormatPage.vue,
// cittadino/index.vue/PublicCittadinoPage.vue) — each filters its own
// standings rows by the same case-insensitive player-name search.
export function filterStandingsBySearch<T extends { playerName: string }>(
  standings: T[], search: string
): T[] {
  const query = search.trim().toLowerCase()
  if (!query) return standings
  return standings.filter(row => row.playerName.toLowerCase().includes(query))
}
