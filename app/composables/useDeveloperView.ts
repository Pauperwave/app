// app\composables\useDeveloperView.ts
// Global "developer view" toggle: layout-debug margin visualization (.debug-spacing, main.css)
// behind a password popover (ported from league's useDeveloperView.ts/ DeveloperViewToggle.vue),
// app-wide via DeveloperViewToggle.vue next to the org selector. Persisted via useLocalStorage
// (explicit import, like every persistence composable here; see the useStorage auto-import
// collision in CLAUDE.md) so it survives reloads while testing.
//
// isOverlayEnabled is a second, independently persisted switch (off by default) for just the margin
// overlay, like league: developer mode can stay unlocked without the outlines being distracting.
import { useLocalStorage } from '@vueuse/core'

const DEVELOPER_VIEW_KEY = 'developer-view-enabled'
const DEVELOPER_VIEW_OVERLAY_KEY = 'developer-view-overlay-enabled'

export function useDeveloperView() {
  const isDeveloperView = useLocalStorage(DEVELOPER_VIEW_KEY, false)
  const isOverlayEnabled = useLocalStorage(DEVELOPER_VIEW_OVERLAY_KEY, false)
  return { isDeveloperView, isOverlayEnabled }
}
