// app\composables\transactions\useTransactionFormOptions.ts
// Shared by AddModal.vue and EditModal.vue — the select options and payment
// schema are identical between creating and editing a transaction.
import * as v from 'valibot'
import { PAYMENT_METHODS, PAYMENT_TYPES } from '#shared/types/transactions'

// No formal "staff members" table to select from/FK against — same hardcoded
// list the original mock form used, restored alongside received_by
// (migration 20260812140000_add_received_by_to_payments.sql).
export const RECEIVER_OPTIONS = [
  'Baldo Riccardo',
  'Cazzola Marco',
  'Castelli Lorenzo',
  'Cordeschi Nicola',
  'Debiasi Samuel',
  'Festi Emanuele',
  'Marisa Simone',
  'Nardi Emanuele',
  'Petrolli Filippo',
  'Pietropoli Carlo'
]

export const EVENT_OPTIONS = [
  'Torneo Commander',
  'Torneo Pauper',
  'Torneo Multiformato',
  'Quota associativa 2025',
  'Draft',
  'Grande evento',
  'Chaos Draft di Natale',
  'Torneo One Piece',
  'Premodern&Birrino',
  'Commanderwave Fest'
]

export function useTransactionFormOptions() {
  const { t } = useI18n()

  const paymentTypeOptions = computed(() => [
    { value: 'Tournament Fee' as const, label: t('transaction.addModal.paymentTypeOptions.entryFee'), icon: ICONS.standings },
    { value: 'Association Fee' as const, label: t('transaction.addModal.paymentTypeOptions.membership'), icon: ICONS.players },
    { value: 'Event Fee' as const, label: t('transaction.addModal.paymentTypeOptions.eventFee'), icon: ICONS.calendar },
    { value: 'Donation' as const, label: t('transaction.addModal.paymentTypeOptions.donation'), icon: ICONS.heartHandshake }
  ])

  const paymentMethodOptions = computed(() => [
    { value: 'Cash' as const, label: t('transaction.addModal.paymentMethodOptions.cash') },
    { value: 'PayPal' as const, label: 'PayPal' },
    { value: 'POS' as const, label: 'POS' }
  ])

  // v.forward(v.partialCheck([...paths], requirement, msg), [path]) is Valibot's
  // equivalent of a .superRefine() with ctx.addIssue on a specific path:
  // partialCheck reads several fields (here payer_is_associate + the target
  // field) to decide whether to raise the error, and forward attaches it to the
  // right field instead of the object root.
  const schema = v.pipe(
    v.object({
      associate_uuid: v.optional(v.string()),
      payer_is_associate: v.optional(v.boolean(), true),
      payer_name: v.optional(v.pipe(
        v.string(), v.minLength(2, t('transaction.addModal.validation.payerFirstNameTooShort'))
      )),
      payer_surname: v.optional(v.pipe(
        v.string(), v.minLength(2, t('transaction.addModal.validation.payerLastNameTooShort'))
      )),
      payer_email: v.optional(v.pipe(v.string(), v.trim(), v.email(), v.toLowerCase())),
      payer_tax_code: v.optional(v.pipe(v.string(), v.trim())),
      payment_datetime: v.string(),
      payment_amount: v.pipe(
        v.number(t('transaction.addModal.validation.amountRequired')),
        v.minValue(0, t('transaction.addModal.validation.amountNotNegative'))
      ),
      payment_method: v.picklist(PAYMENT_METHODS, t('transaction.addModal.validation.invalidPaymentMethod')),
      payment_type: v.picklist(PAYMENT_TYPES, t('transaction.addModal.validation.invalidPaymentType')),
      received_by: v.pipe(
        v.string(t('transaction.addModal.validation.receivedByRequired')),
        v.minLength(1, t('transaction.addModal.validation.receivedByRequired'))
      ),
      event_name: v.optional(v.string()),
      notes: v.optional(v.string())
    }),
    v.forward(
      v.partialCheck(
        [['payer_is_associate'], ['payer_name']],
        input => !!input.payer_is_associate || !!input.payer_name,
        t('transaction.addModal.validation.payerFirstNameRequired')
      ),
      ['payer_name']
    ),
    v.forward(
      v.partialCheck(
        [['payer_is_associate'], ['payer_surname']],
        input => !!input.payer_is_associate || !!input.payer_surname,
        t('transaction.addModal.validation.payerLastNameRequired')
      ),
      ['payer_surname']
    ),
    v.forward(
      v.partialCheck(
        [['payer_is_associate'], ['payer_email']],
        input => !!input.payer_is_associate || !!input.payer_email,
        t('transaction.addModal.validation.payerEmailRequired')
      ),
      ['payer_email']
    ),
    v.forward(
      v.partialCheck(
        [['payer_is_associate'], ['payer_tax_code']],
        input => !!input.payer_is_associate || !!input.payer_tax_code,
        t('transaction.addModal.validation.payerTaxCodeRequired')
      ),
      ['payer_tax_code']
    ),
    v.forward(
      v.partialCheck(
        [['payer_is_associate'], ['associate_uuid']],
        input => !input.payer_is_associate || !!input.associate_uuid,
        t('transaction.addModal.validation.associateRequired')
      ),
      ['associate_uuid']
    )
  )

  return { schema, paymentTypeOptions, paymentMethodOptions }
}
