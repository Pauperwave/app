// app\utils\associates\formatPhoneNumber.ts
import { parsePhoneNumberFromString } from 'libphonenumber-js/min'

// pauperwave_associates.phone_number is stored as E.164 ("+393203522674",
// see UPhoneInput.vue) — unreadable as-is in a table cell. International
// format ("+39 320 352 2674") reads correctly regardless of the associate's
// country, unlike formatNational() which would drop the country code.
export function formatPhoneNumber(phoneNumber: string | null | undefined): string {
  if (!phoneNumber) return ''
  const parsed = parsePhoneNumberFromString(phoneNumber)
  return parsed?.isValid() ? parsed.formatInternational() : phoneNumber
}
