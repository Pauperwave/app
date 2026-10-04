// server\utils\telegram\commands\cards\manaCost.ts
import { ICONS } from '~~/server/utils/telegram/icons'

const MANA_SYMBOLS: Record<string, string> = {
  W: ICONS.manaWhite,
  U: ICONS.manaBlue,
  B: ICONS.manaBlack,
  R: ICONS.manaRed,
  G: ICONS.manaGreen,
  C: ICONS.manaColorless,
  S: ICONS.manaSnow
}

// "W/U" and "2/W" hybrids and "W/P" phyrexian become "(⚪/🔵)"; numbers, X and "P" stay as text
function formatSymbol(symbol: string): string {
  const parts = symbol.split('/').map(part => MANA_SYMBOLS[part] ?? part)
  return parts.length > 1 ? `(${parts.join('/')})` : parts[0] ?? symbol
}

// Scryfall notation ("{2}{R}{W}", "{1}{B} // {B}") as plain text with a colored dot per color
export function formatManaCost(manaCost: string): string {
  return manaCost.replace(/\{([^}]+)\}/g, (_match, symbol: string) => formatSymbol(symbol))
}
