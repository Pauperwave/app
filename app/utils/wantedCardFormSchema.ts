// app\utils\wantedCardFormSchema.ts
import * as v from 'valibot'

// Fields shared between AddModal and EditModal (wanted-cards) — every request
// has these regardless of how it was created. AddModal spreads its own `name`
// field on top; EditModal's card name is fixed, not part of the schema.
export function wantedCardFormFieldsSchema(t: (key: string) => string) {
  return {
    printingId: v.pipe(
      v.string(t('wantedCard.addModal.validation.printingRequired')),
      v.minLength(1, t('wantedCard.addModal.validation.printingRequired'))
    ),
    copies: v.pipe(
      v.number(t('wantedCard.addModal.validation.copiesRequired')),
      v.integer(t('wantedCard.addModal.validation.copiesInteger')),
      v.minValue(1, t('wantedCard.addModal.validation.copiesPositive'))
    ),
    language: v.string(),
    foil: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    player: v.pipe(
      v.string(t('wantedCard.addModal.validation.playerRequired')),
      v.minLength(1, t('wantedCard.addModal.validation.playerRequired'))
    )
  }
}
