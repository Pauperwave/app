// app\utils\associates\associateFormSchema.ts
import * as v from 'valibot'
import { parsePhoneNumberFromString } from 'libphonenumber-js/min'

// Shared by associates/list/AddModal.vue (staff-created) and /tesseramento (public form): the same
// record, two entry points. v.string(msg)/v.number(msg) also customise the TYPE error: a
// never-selected field otherwise failed the type check with a generic message before reaching
// .min() (same pattern as the wanted-cards form schema)
export function associateFormSchema(t: (key: string) => string) {
  return {
    // English values to match AssociateType: the DB stores English, Italian labels come from
    // associate.types.* in it.json
    associate_type: v.picklist(['regular', 'sustaining']),
    first_name: v.pipe(
      v.string(t('associate.addModal.validation.firstNameTooShort')),
      v.trim(),
      v.minLength(2, t('associate.addModal.validation.firstNameTooShort'))
    ),
    last_name: v.pipe(
      v.string(t('associate.addModal.validation.lastNameTooShort')),
      v.trim(),
      v.minLength(2, t('associate.addModal.validation.lastNameTooShort'))
    ),
    email_address: v.pipe(
      v.string(t('associate.addModal.validation.invalidEmail')),
      v.trim(),
      v.email(t('associate.addModal.validation.invalidEmail')),
      v.toLowerCase()
    ),
    // E.164 ("+393203522674") from UPhoneInput, not digits-only: existing data isn't all Italian,
    // and libphonenumber-js's per-country check catches malformed numbers a length regex would
    // miss. Required/empty is enforced conditionally below (v.forward): a minor may not have their
    // own number (isMinor.ts)
    phone_number: v.pipe(
      v.string(t('associate.addModal.validation.invalidPhoneNumber')),
      v.custom(
        val => typeof val === 'string' && (val === '' || !!parsePhoneNumberFromString(val)?.isValid()),
        t('associate.addModal.validation.invalidPhoneNumber')
      )
    ),
    tax_code: v.pipe(
      v.string(t('associate.addModal.validation.invalidTaxCode')),
      v.trim(),
      v.regex(/^[A-Z0-9]{16}$/i, t('associate.addModal.validation.invalidTaxCode')),
      // Shape alone (16 alphanumeric chars) lets a typo'd/transposed code through, see
      // isValidTaxCodeChecksum.ts
      v.check(isValidTaxCodeChecksum, t('associate.addModal.validation.invalidTaxCode'))
    ),
    born_location: v.pipe(
      v.string(t('associate.addModal.validation.birthLocationRequired')),
      v.trim(),
      v.minLength(2, t('associate.addModal.validation.birthLocationRequired'))
    ),
    born_date: v.pipe(
      v.date(t('associate.addModal.validation.birthDateNotFuture')),
      v.maxValue(new Date(), t('associate.addModal.validation.birthDateNotFuture'))
    ),
    // Length/required enforced conditionally below (v.forward): a non-Italian birth state has no
    // province (isItalianBirthState.ts)
    born_province: v.pipe(v.string(), v.trim()),
    born_state: v.pipe(
      v.string(t('associate.addModal.validation.birthStateRequired')),
      v.trim(),
      v.minLength(2, t('associate.addModal.validation.birthStateRequired'))
    ),
    residency_address: v.pipe(
      v.string(t('associate.addModal.validation.residencyAddressRequired')),
      v.trim(),
      v.minLength(5, t('associate.addModal.validation.residencyAddressRequired'))
    ),
    // Optional and separate from residency_address: Italian address formats ("Via Roma, 12",
    // "12/A", "snc") are too varied to split reliably, and some real addresses have no number
    residency_house_number: v.nullable(v.pipe(v.string(), v.trim())),
    residency_city: v.pipe(
      v.string(t('associate.addModal.validation.residencyCityRequired')),
      v.trim(),
      v.minLength(2, t('associate.addModal.validation.residencyCityRequired'))
    ),
    residency_province: v.pipe(
      v.string(t('associate.addModal.validation.residencyProvinceInvalid')),
      v.trim(),
      v.length(2, t('associate.addModal.validation.residencyProvinceInvalid'))
    ),
    residency_cap: v.pipe(
      v.string(t('associate.addModal.validation.residencyCapInvalid')),
      v.trim(),
      v.regex(/^\d{5}$/, t('associate.addModal.validation.residencyCapInvalid'))
    ),
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

// Wraps associateFormSchema() with the cross-field rules (each v.forward attaches its error to the
// dependent field so it surfaces on the right UFormField): single source of truth for
// AddModal.vue/EditModal.vue/tesseramento
export function associateFormObjectSchema(t: (key: string) => string) {
  return v.pipe(
    v.object(associateFormSchema(t)),
    v.forward(
      v.partialCheck(
        [['born_state'], ['born_province']],
        input => !isItalianBirthState(input.born_state) || /^[A-Za-z]{2}$/.test(input.born_province),
        t('associate.addModal.validation.birthProvinceRequired')
      ),
      ['born_province']
    ),
    v.forward(
      v.partialCheck(
        [['born_date'], ['phone_number']],
        input => isMinor(input.born_date) || input.phone_number.trim() !== '',
        t('associate.addModal.validation.phoneNumberRequired')
      ),
      ['phone_number']
    ),
    v.forward(
      v.partialCheck(
        [['born_date'], ['tax_code']],
        input => doesTaxCodeMatchBirthDate(input.tax_code, input.born_date),
        t('associate.addModal.validation.taxCodeBirthDateMismatch')
      ),
      ['tax_code']
    )
  )
}
