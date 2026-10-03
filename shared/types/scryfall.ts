// shared\types\scryfall.ts

// The part of Scryfall's card object the wanted-cards features read (the site's picker, the
// Telegram bot's price and import flows)

export interface ScryfallImageUris {
  small?: string
  normal?: string
  large?: string
  art_crop?: string
}

export interface ScryfallFace {
  mana_cost?: string
  image_uris?: ScryfallImageUris
}

export interface ScryfallCard {
  id: string
  name: string
  set: string
  set_name: string
  collector_number: string
  finishes?: string[]
  prices?: { eur?: string | null, eur_foil?: string | null }
  purchase_uris?: { cardmarket?: string }
  scryfall_uri: string
  mana_cost?: string
  color_identity?: string[]
  type_line?: string
  cmc?: number
  image_uris?: ScryfallImageUris
  card_faces?: ScryfallFace[]
}
