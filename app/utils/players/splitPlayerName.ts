// app\utils\players\splitPlayerName.ts

/** Splits a "First Last" label into its first-name and surname parts, for
 *  AssociateTag's bold/colored surname rendering (mirrors league's
 *  PlayerNameTag split). Everything before the last space is the first
 *  name, the last word is the surname. */
export function splitPlayerName(label: string): { firstName: string, surname: string } {
  const lastSpaceIndex = label.lastIndexOf(' ')
  if (lastSpaceIndex === -1) return { firstName: label, surname: '' }
  return { firstName: label.slice(0, lastSpaceIndex), surname: label.slice(lastSpaceIndex + 1) }
}
