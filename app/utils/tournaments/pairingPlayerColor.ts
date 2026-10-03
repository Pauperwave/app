// app\utils\tournaments\pairingPlayerColor.ts
// Per-player color for the kill-tracking canvas, ported from league's playerColor.ts and keyed by
// TablePlayer.value (the player_uuid of this round's pairing rows, see RoundPairingCard.vue).
// Cycles through Nuxt UI's semantic color tokens so a player's kill edges share one color across
// the canvas.
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
