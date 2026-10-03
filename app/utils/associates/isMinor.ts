// app\utils\associates\isMinor.ts
import { differenceInYears } from 'date-fns'

// Shared by PersonalInfoFields.vue (drops phone_number's "required" indicator) and
// associateFormSchema.ts (same rule in validation): a minor may not have their own phone. Defaults
// to false (adult) while born_date is unknown (/tesseramento asks personalInfo first)
export function isMinor(bornDate: Date | null | undefined): boolean {
  if (!bornDate) return false
  return differenceInYears(new Date(), bornDate) < 18
}
