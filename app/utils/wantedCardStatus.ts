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
