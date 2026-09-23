// app\composables\useDirtyFormSnapshot.ts
// Tracks whether a reactive form `state` still matches its last loaded/saved
// snapshot (plain JSON.stringify comparison) and guards the page from being
// closed with unsaved edits — shared by every /settings form section
// (TimerSettingsForm.vue, TournamentSettingsForm.vue, ...), which
// independently duplicated this exact block (fallow:dupes, 2026-09-23).
// Each caller still owns its own watch(settings.data, ...) fill-once logic
// (the actual field mapping differs per form) — this only owns the
// dirty-tracking mechanism around it.
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
