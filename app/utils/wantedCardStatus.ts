// app\utils\wantedCardStatus.ts
import type { WantedCardStatus } from '~/types'

export const WANTED_CARD_STATUSES: WantedCardStatus[] = ['searching', 'found', 'abandoned']

/** searching=in corso (warning), found=risolta con successo (success),
 * abandoned=chiusa senza esito (neutral — non un errore, solo "non cerco più"). */
export function wantedCardStatusColor(status: WantedCardStatus): 'warning' | 'success' | 'neutral' {
  if (status === 'found') return 'success'
  if (status === 'abandoned') return 'neutral'
  return 'warning'
}

/** Per le viste compatte (griglia): il badge di stato diventa icona-only con
 * l'etichetta nel tooltip. "Abbandonata" è l'etichetta più lunga delle tre e
 * mandava a capo il footer della card, che è largo ~200px. Nelle viste con
 * spazio (tabella) il badge resta testuale. */
export const WANTED_CARD_STATUS_ICONS: Record<WantedCardStatus, string> = {
  searching: 'i-lucide-search',
  found: 'i-lucide-check-circle',
  abandoned: 'i-lucide-ban'
}
