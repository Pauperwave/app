// app\composables\transactions\useTransactionFormOptions.ts
// Shared by AddModal.vue and EditModal.vue — the select options and payment
// schema are identical between creating and editing a transaction.
import * as v from 'valibot'
import { CalendarDateTime } from '@internationalized/date'
import { PAYMENT_METHODS, PAYMENT_TYPES } from '#shared/types/transactions'

// The association's own membership record (used for its own admin/bookkeeping
// purposes, not an actual payer) — excluded from payer pickers on transaction
// forms. Matched by uuid, not name, since names can be edited freely.
// Declared before the array-literal exports below: an export placed
// immediately after one is silently dropped from Nuxt's auto-imports (see
// CLAUDE.md's "Auto-imports" note, confirmed 2026-08-09 on cittadinoPoints.ts).
export const APS_PAUPERWAVE_ASSOCIATE_UUID = '8578797c-62b0-4e48-a237-3b65683a2623'

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

export function useTransactionFormOptions() {
  const { t } = useI18n()

  // Real tournaments/events to link a Tournament Fee/Event Fee/Token
  // Purchase payment to (2026-08-25 fix) — replaces EVENT_OPTIONS, a
  // hardcoded list of free-text strings never actually tied to
  // tournament_uuid/event_uuid, which is how "PREMODERN TAPPA 1" (raw
  // historical event_name) ended up shown as if it were a real selection.
  const dateFormatter = new Intl.DateTimeFormat('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })

  const { data: tournamentsData } = useTournamentsQuery()
  // Same name recurs across every stage of a league (e.g. "Pauper" x N) —
  // without the stage number + date as a description (USelectMenu renders it
  // muted, under the label) same-named tournaments are indistinguishable in
  // this dropdown (user request, 2026-08-25).
  const tournamentOptions = computed(() => (tournamentsData.value ?? []).map((tournament) => {
    // Cancelled tournaments never get a stageNumber (assignTournamentStageNumbers
    // skips them entirely) — say so explicitly instead of just omitting it,
    // otherwise a cancelled stage looks identical to an un-leagued tournament.
    const stageText = tournament.status === 'cancelled'
      ? t('tournament.status.cancelled')
      : tournament.stageNumber ? `${tournament.stageNumber}ª tappa` : null
    const dateText = dateFormatter.format(new Date(tournament.startDate))
    return {
      value: tournament.uuid,
      label: tournament.name,
      description: stageText ? `${stageText} · ${dateText}` : dateText
    }
  }))
  const { data: eventsData } = useEventsQuery()
  const eventOptions = computed(() => (eventsData.value ?? []).map(event => ({
    value: event.uuid, label: event.name
  })))

  const paymentTypeOptions = computed(() => [
    { value: 'Tournament Fee' as const, label: t('transaction.addModal.paymentTypeOptions.entryFee'), icon: ICONS.standings },
    { value: 'Event Fee' as const, label: t('transaction.addModal.paymentTypeOptions.eventFee'), icon: ICONS.calendar },
    { value: 'Association Fee' as const, label: t('transaction.addModal.paymentTypeOptions.membership'), icon: ICONS.players },
    { value: 'Donation' as const, label: t('transaction.addModal.paymentTypeOptions.donation'), icon: ICONS.heartHandshake },
    { value: 'Token Purchase' as const, label: t('transaction.addModal.paymentTypeOptions.tokenPurchase'), icon: ICONS.coins }
  ])

  const paymentMethodOptions = computed(() => [
    { value: 'Cash' as const, label: t('transaction.addModal.paymentMethodOptions.cash'), icon: ICONS.wallet },
    { value: 'PayPal' as const, label: 'PayPal', icon: 'i-simple-icons-paypal' },
    { value: 'POS' as const, label: 'POS', icon: ICONS.creditCard },
    { value: 'Comped' as const, label: t('transaction.addModal.paymentMethodOptions.comped'), icon: ICONS.heartHandshake }
  ])

  // Same avatar convention as AssociateTag.vue (DiceBear, generated deterministically
  // from the name) — RECEIVER_OPTIONS has no associate_uuid to look up (it's a
  // hardcoded staff-name list, see the constant's own comment), so this can't
  // reuse AssociateTag itself, only the avatar it'd produce.
  const receiverOptions = computed(() => RECEIVER_OPTIONS.map(name => ({
    label: name,
    value: name,
    avatar: { src: generatePlayerAvatar(name), alt: name }
  })))

  // The associate/external payer UTabs — identical between AddModal.vue and
  // EditModal.vue (extracted 2026-08-15), only the tab's *meaning* differs
  // (payer_is_associate toggle) which stays per-file.
  const payerTabItems = computed(() => [
    { label: t('transaction.addModal.tabs.associate'), icon: ICONS.playerConfirmed, slot: 'associate', value: 'associate' },
    { label: t('transaction.addModal.tabs.external'), icon: ICONS.edit, slot: 'external', value: 'external' }
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
        v.string(), v.trim(), v.minLength(2, t('transaction.addModal.validation.payerFirstNameTooShort'))
      )),
      payer_surname: v.optional(v.pipe(
        v.string(), v.trim(), v.minLength(2, t('transaction.addModal.validation.payerLastNameTooShort'))
      )),
      payer_email: v.optional(v.pipe(
        v.string(), v.trim(), v.email(t('transaction.addModal.validation.payerEmailInvalid')), v.toLowerCase()
      )),
      payer_tax_code: v.optional(v.pipe(v.string(), v.trim())),
      payment_datetime: v.instance(CalendarDateTime, t('transaction.addModal.validation.paymentDateRequired')),
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
      tournament_uuid: v.optional(v.string()),
      event_uuid: v.optional(v.string()),
      event_name: v.optional(v.pipe(v.string(), v.trim())),
      notes: v.optional(v.pipe(v.string(), v.trim()))
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
    ),
    // Mirrors ck_payment_type_event_link (migration 20260825220000) —
    // Tournament Fee needs tournament_uuid, Event Fee/Token Purchase need
    // event_uuid, Association Fee/Donation need neither.
    v.forward(
      v.partialCheck(
        [['payment_type'], ['tournament_uuid']],
        input => input.payment_type !== 'Tournament Fee' || !!input.tournament_uuid,
        t('transaction.addModal.validation.tournamentRequired')
      ),
      ['tournament_uuid']
    ),
    v.forward(
      v.partialCheck(
        [['payment_type'], ['event_uuid']],
        input => (input.payment_type !== 'Event Fee' && input.payment_type !== 'Token Purchase')
          || !!input.event_uuid,
        t('transaction.addModal.validation.eventRequired')
      ),
      ['event_uuid']
    )
  )

  return {
    schema,
    paymentTypeOptions,
    paymentMethodOptions,
    receiverOptions,
    payerTabItems,
    tournamentOptions,
    eventOptions
  }
}
