// server\utils\telegram\commands\cards\manaCost.ts

// Scryfall notation ("{2}{R}{W}", "{1}{B} // {B}") as plain letters: "2RW", "1B // B". Hybrid and
// phyrexian symbols keep their slash inside parentheses: "(W/U)", "(G/P)".
export function formatManaCost(manaCost: string): string {
  return manaCost.replace(/\{([^}]+)\}/g, (_match, symbol: string) => {
    return symbol.includes('/') ? `(${symbol})` : symbol
  })
}
