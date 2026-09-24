// app\utils\players\splitPlayerName.ts

/** Splits a "First Last" label into its first-name and surname parts, for
 *  AssociateTag's bold/colored surname rendering (mirrors league's
 *  PlayerNameTag split). Everything before the last space is the first
 *  name, the last word is the surname — wrong for a compound surname ("Del
 *  Piero", "De La Cruz"), which is exactly why playerNameParts() below
 *  prefers a real surname field when the caller has one. Kept as the
 *  fallback for the rare TablePlayer built without one. */
export function splitPlayerName(label: string): { firstName: string, surname: string } {
  const lastSpaceIndex = label.lastIndexOf(' ')
  if (lastSpaceIndex === -1) return { firstName: label, surname: '' }
  return { firstName: label.slice(0, lastSpaceIndex), surname: label.slice(lastSpaceIndex + 1) }
}

/** Prefers a TablePlayer's own real firstName/surname (set by
 *  tablePlayersFor et al. from the associate record) over guessing a split
 *  from `label` — same idea as league's usePlayerDisplay.ts, which strips
 *  the real (possibly multi-word) surname off the full name rather than
 *  assuming the surname is always the label's last word. */
export function playerNameParts(
  player: { label: string, firstName?: string, surname?: string }
): { firstName: string, surname: string } {
  if (player.surname !== undefined) return { firstName: player.firstName ?? '', surname: player.surname }
  return splitPlayerName(player.label)
}
