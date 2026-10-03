// app\utils\associates\isItalianBirthState.ts
// born_state is free text ("IT", but existing rows also hold "Repubblica San Marino"): matched
// loosely so "IT" and "Italia" count, since born_province (an Italian province code) only applies
// to an Italian birthplace. Shared by BirthInfoFields.vue (hides/un-requires the province) and
// associateFormSchema.ts (same rule in validation)
export function isItalianBirthState(bornState: string | null | undefined): boolean {
  const normalized = (bornState ?? '').trim().toLowerCase()
  return normalized === 'it' || normalized === 'italia'
}
