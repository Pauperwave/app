// app\utils\associates\formatPhoneNumber.ts
import { parsePhoneNumberFromString } from 'libphonenumber-js/min'

// phone_number is stored as E.164 ("+393203522674", see UPhoneInput.vue), unreadable in a cell.
// International format ("+39 320 352 2674") works for any country, unlike formatNational(), which
// drops the country code
export function formatPhoneNumber(phoneNumber: string | null | undefined): string {
  if (!phoneNumber) return ''
  const parsed = parsePhoneNumberFromString(phoneNumber)
  return parsed?.isValid() ? parsed.formatInternational() : phoneNumber
}
