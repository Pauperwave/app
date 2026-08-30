// app\utils\wantedCards\wantedCardEditsFromPrinting.ts
import type { ScryfallPrinting } from '~/composables/useScryfallCardSearch'
import type { WantedCardEditsPayload } from '#shared/types/wantedCards'

// Shared by AddModal.vue and EditModal.vue's onSubmit (fallow:dupes, 2026-08-31
// flagged a byte-identical 14-line clone once EditModal's own edits object was
// pulled out of its mutateAsync call) — every non-cardName field of
// NewWantedCardPayload comes straight from the picked printing + these five
// form fields, regardless of create vs. edit.
export function wantedCardEditsFromPrinting(
  printing: ScryfallPrinting,
  formData: { player: string, copies: number, language: string, foil?: boolean, notes?: string }
): WantedCardEditsPayload {
  return {
    playerAssociateUuid: formData.player,
    scryfallUrl: printing.scryfallUrl,
    scryfallId: printing.id,
    setCode: printing.set,
    manaCost: printing.manaCost,
    colorIdentity: printing.colorIdentity,
    typeLine: printing.typeLine || null,
    cmc: printing.cmc,
    imageUrl: printing.imageUrl,
    cardmarketPrice: printing.price,
    copies: formData.copies,
    language: formData.language === 'any' ? null : formData.language,
    treatment: formData.foil ? ['foil'] : [],
    notes: formData.notes || null
  }
}
