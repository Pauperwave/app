// app\utils\associates\associateFormSchema.ts
import * as v from 'valibot'
import { parsePhoneNumberFromString } from 'libphonenumber-js/min'

// Shared by associates/list/AddModal.vue (internal, staff-created) and
// /tesseramento (public self-service form) — same associate record, two entry
// points. v.string(msg)/v.number(msg) also customise the TYPE error (not just
// constraints like minLength/minValue): a never-selected field failed the type
// check before even reaching .min() with a generic message otherwise
// (see the wanted-cards form schema for the same pattern).
export function associateFormSchema(t: (key: string) => string) {
  return {
    // English values to match AssociateType ('regular' | 'sustaining') — the DB
    // stores English, Italian display labels come from associate.types.* in
    // it.json, never baked into the stored value itself.
    associate_type: v.picklist(['regular', 'sustaining']),
    first_name: v.pipe(
      v.string(t('associate.addModal.validation.firstNameTooShort')),
      v.minLength(2, t('associate.addModal.validation.firstNameTooShort'))
    ),
    last_name: v.pipe(
      v.string(t('associate.addModal.validation.lastNameTooShort')),
      v.minLength(2, t('associate.addModal.validation.lastNameTooShort'))
    ),
    email_address: v.pipe(
      v.string(t('associate.addModal.validation.invalidEmail')),
      v.trim(),
      v.email(t('associate.addModal.validation.invalidEmail')),
      v.toLowerCase()
    ),
    // E.164 ("+393203522674"), produced by UPhoneInput — not digits-only.
    // Existing data isn't all Italian (one row is "+43 664 3434243"), so a
    // hardcoded country/mask was never correct; libphonenumber-js's own
    // per-country validity check catches malformed numbers a naive length
    // regex would miss (or wrongly reject).
    phone_number: v.pipe(
      v.string(t('associate.addModal.validation.invalidPhoneNumber')),
      v.custom(
        val => typeof val === 'string' && !!parsePhoneNumberFromString(val)?.isValid(),
        t('associate.addModal.validation.invalidPhoneNumber')
      )
    ),
    tax_code: v.pipe(
      v.string(t('associate.addModal.validation.invalidTaxCode')),
      v.regex(/^[A-Z0-9]{16}$/i, t('associate.addModal.validation.invalidTaxCode'))
    ),
    born_location: v.pipe(
      v.string(t('associate.addModal.validation.birthLocationRequired')),
      v.minLength(2, t('associate.addModal.validation.birthLocationRequired'))
    ),
    born_date: v.pipe(
      v.date(t('associate.addModal.validation.birthDateNotFuture')),
      v.maxValue(new Date(), t('associate.addModal.validation.birthDateNotFuture'))
    ),
    born_province: v.pipe(
      v.string(t('associate.addModal.validation.birthProvinceRequired')),
      v.length(2, t('associate.addModal.validation.birthProvinceRequired'))
    ),
    born_state: v.pipe(
      v.string(t('associate.addModal.validation.birthStateRequired')),
      v.minLength(2, t('associate.addModal.validation.birthStateRequired'))
    ),
    residency_address: v.pipe(
      v.string(t('associate.addModal.validation.residencyAddressRequired')),
      v.minLength(5, t('associate.addModal.validation.residencyAddressRequired'))
    ),
    // Optional — separate field from residency_address rather than parsed out
    // of it (Italian address formats vary too much — "Via Roma, 12", "12/A",
    // "snc" for no number — to split reliably), matching how Italian official
    // forms already separate "Indirizzo" and "Civico". Some real addresses
    // genuinely have no house number ("snc"), hence optional like the DB column.
    residency_house_number: v.nullable(v.string()),
    residency_city: v.pipe(
      v.string(t('associate.addModal.validation.residencyCityRequired')),
      v.minLength(2, t('associate.addModal.validation.residencyCityRequired'))
    ),
    residency_province: v.pipe(
      v.string(t('associate.addModal.validation.residencyProvinceInvalid')),
      v.length(2, t('associate.addModal.validation.residencyProvinceInvalid'))
    ),
    residency_cap: v.pipe(
      v.string(t('associate.addModal.validation.residencyCapInvalid')),
      v.regex(/^\d{5}$/, t('associate.addModal.validation.residencyCapInvalid'))
    ),
    // Optional (skippable step on /tesseramento — see mtgNicknamesSkipped).
    mtgo_nickname: v.nullable(v.string()),
    mtga_nickname: v.nullable(v.string()),
    consent_data: v.pipe(
      v.boolean(),
      v.check(val => val === true, t('associate.addModal.validation.consentDataRequired'))
    ),
    consent_social: v.optional(v.boolean()),
    has_read_statute: v.pipe(
      v.boolean(),
      v.check(val => val === true, t('associate.addModal.validation.statuteReadRequired'))
    )
  }
}
