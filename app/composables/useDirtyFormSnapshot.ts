// app\composables\useDirtyFormSnapshot.ts
// Tracks whether a reactive form `state` still matches its last loaded/saved snapshot (plain
// JSON.stringify comparison) and guards the page from closing with unsaved edits: shared by every
// /settings form section (TimerSettingsForm.vue, TournamentSettingsForm.vue, ...). Each caller
// keeps its own watch(settings.data, ...) fill-once logic (the field mapping differs); this owns
// only the dirty tracking
export function useDirtyFormSnapshot(state: object) {
  const savedSnapshot = ref('')
  const isDirty = computed(() => JSON.stringify(state) !== savedSnapshot.value)

  function markSaved() {
    savedSnapshot.value = JSON.stringify(state)
  }

  useEventListener('beforeunload', (event) => {
    if (isDirty.value) event.preventDefault()
  })

  return { isDirty, markSaved }
}
