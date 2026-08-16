// app\composables\associates\useAssociateFormState.ts

// Shared by associates/list/AddModal.vue, associates/list/EditModal.vue, and
// /tesseramento — same associate_type picklist, same form field set.
export function useAssociateTypeOptions() {
  const { t } = useI18n()
  return computed(() => [
    { label: t('associate.types.regular'), value: 'regular' as const },
    { label: t('associate.types.sustaining'), value: 'sustaining' as const }
  ])
}

// bornDate defaults to undefined for EditModal/tesseramento (unset until
// populated); AddModal passes new Date('1990-01-01') so the calendar opens
// on a sensible year instead of the current date.
export function createAssociateFormState(bornDate: Date | undefined = undefined) {
  return reactive({
    associate_type: 'regular' as 'regular' | 'sustaining',
    first_name: '',
    last_name: '',
    email_address: '',
    phone_number: '',
    tax_code: '',
    born_location: '',
    born_date: bornDate,
    born_province: '',
    born_state: '',
    residency_address: '',
    residency_house_number: null as string | null,
    residency_city: '',
    residency_province: '',
    residency_cap: '',
    mtgo_nickname: null as string | null,
    mtga_nickname: null as string | null,
    has_read_statute: false,
    consent_data: false,
    consent_social: false
  })
}
