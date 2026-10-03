// app\utils\players\splitPlayerName.ts

/**
 * Splits a "First Last" label into first name and surname, for AssociateTag's bold/colored surname
 * (like league's  PlayerNameTag). Everything before the last space is the first name: wrong for a
 * compound surname ("Del Piero"),  hence playerNameParts() below prefers a real surname field and
 * keeps this as the fallback.
 */
export function splitPlayerName(label: string): { firstName: string, surname: string } {
  const lastSpaceIndex = label.lastIndexOf(' ')
  if (lastSpaceIndex === -1) return { firstName: label, surname: '' }
  return { firstName: label.slice(0, lastSpaceIndex), surname: label.slice(lastSpaceIndex + 1) }
}

/**
 * Prefers a TablePlayer's real firstName/surname (set by tablePlayersFor et al.) over guessing a
 * split from `label`
 */
export function playerNameParts(
  player: { label: string, firstName?: string, surname?: string }
): { firstName: string, surname: string } {
  if (player.surname !== undefined) return { firstName: player.firstName ?? '', surname: player.surname }
  return splitPlayerName(player.label)
}
