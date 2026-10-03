// app\utils\players\playerAvatar.ts
import { Style, Avatar } from '@dicebear/core'
import adventurer from '@dicebear/styles/adventurer.json'

// One Style instance for every avatar (DiceBear guidance): parsing the style definition is the
// expensive part
const style = new Style(adventurer)

/**
 * Deterministic placeholder avatar (DiceBear "adventurer") for a player with no real `avatarUrl`:
 * the same seed always renders the same SVG, with no network call. `idRandomization: false` keeps
 * SSR and client byte-identical (no hydration mismatch on the generated element IDs). /
 */
export function generatePlayerAvatar(seed: string | number): string {
  return new Avatar(style, { seed: String(seed), size: 128, idRandomization: false }).toDataUri()
}
