// server\utils\telegram\inlinePrefixes.ts

// How an inline query says what is being searched: "€ name" prices a card (PRICE_INLINE_PREFIX in
// commands/cards/priceCard.ts), "# name" looks for a commander and "+ name" for the second one
// of a pair. A query with none of them gets the hints (commands/inlineHints.ts).
export const COMMANDER_QUERY_PREFIX = '#'
export const SECOND_COMMANDER_QUERY_PREFIX = '+'
