// app\composables\useLocationOrganizerOptions.ts
// Shared by events/list/AddModal.vue and tournaments' useTournamentFormFields.ts: the
// locations/organizations -> select-option mapping
export function useLocationOrganizerOptions() {
  const { data: locations } = useLocationsQuery()
  const { data: organizations } = useOrganizationsQuery()

  const locationOptions = computed(() => (locations.value ?? []).map(location => ({
    value: location.uuid, label: location.name
  })))
  const organizerOptions = computed(() => (organizations.value ?? []).map(organization => ({
    value: organization.uuid, label: organization.name
  })))

  return { locationOptions, organizerOptions }
}
