// app\utils\associates\isItalianBirthState.ts
// born_state is free text (placeholder suggests "IT", but existing rows also
// hold full names like "Repubblica San Marino") — matched loosely so both
// "IT" and "Italia" count, since born_province (an Italian province code)
// only makes sense for an Italian birthplace. Shared between
// BirthInfoFields.vue (hides/un-requires the province field) and
// associateFormSchema.ts (mirrors the same rule in validation).
export function isItalianBirthState(bornState: string | null | undefined): boolean {
  const normalized = (bornState ?? '').trim().toLowerCase()
  return normalized === 'it' || normalized === 'italia'
}
