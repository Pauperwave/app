// app\utils\tournaments\pairingPlayerColor.ts
// Per-player color for the kill-tracking canvas — ported from
// MagicTheGathering/league's utils/playerColor.ts (user request, 2026-09-16),
// keyed by TablePlayer.value (the player_uuid this round's pairing rows use,
// see RoundPairingCard.vue's own comment on that vs. associate uuid) instead
// of a numeric player id. Cycles through Nuxt UI's semantic color tokens so
// a player's kill edges share one color across the canvas, consistent with
// the rest of the app's design system.
export type PairingPlayerColor
  = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error'

const PLAYER_COLORS: PairingPlayerColor[]
  = ['primary', 'secondary', 'success', 'info', 'warning', 'error']

export function getPairingPlayerColorMap(
  players: { value: string }[]
): Map<string, PairingPlayerColor> {
  return new Map(players.map((player, index) =>
    [player.value, PLAYER_COLORS[index % PLAYER_COLORS.length] ?? 'primary']))
}
