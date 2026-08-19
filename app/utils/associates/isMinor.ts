// app\utils\associates\isMinor.ts
import { differenceInYears } from 'date-fns'

// Shared between PersonalInfoFields.vue (drops the "required" indicator off
// phone_number) and associateFormSchema.ts (mirrors the same rule in
// validation) — an associate under 18 may not have their own phone number.
// Defaults to false (adult, phone required) when born_date isn't known yet
// (e.g. /tesseramento's personalInfo step, asked before birthInfo).
export function isMinor(bornDate: Date | null | undefined): boolean {
  if (!bornDate) return false
  return differenceInYears(new Date(), bornDate) < 18
}
