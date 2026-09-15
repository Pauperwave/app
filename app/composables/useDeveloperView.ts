// app\composables\useDeveloperView.ts
// Global "developer view" toggle — layout-debug margin visualization
// (.debug-spacing, main.css), gated behind a password popover (ported from
// MagicTheGathering/league's useDeveloperView.ts/DeveloperViewToggle.vue,
// user request, 2026-09-18: "copia da league il tasto developer"). Was
// page-local to the tournament detail page only (user request, 2026-09-14)
// — now app-wide via DeveloperViewToggle.vue, next to the org selector.
// Persisted via useLocalStorage (explicit import, not auto-import — see the
// useStorage auto-import collision gotcha in CLAUDE.md; useLocalStorage
// isn't known to collide with anything, but importing explicitly here keeps
// every persistence composable in this file consistent) so it survives
// reloads while testing.
//
// isOverlayEnabled is a second, independently-persisted switch (off by
// default, same reasoning as isDeveloperView) for just the margin overlay
// itself, same two-tier split as league's own useDeveloperView.ts — lets
// developer mode stay unlocked without the outline overlay being visually
// distracting unless explicitly turned on too.
import { useLocalStorage } from '@vueuse/core'

const DEVELOPER_VIEW_KEY = 'developer-view-enabled'
const DEVELOPER_VIEW_OVERLAY_KEY = 'developer-view-overlay-enabled'

export function useDeveloperView() {
  const isDeveloperView = useLocalStorage(DEVELOPER_VIEW_KEY, false)
  const isOverlayEnabled = useLocalStorage(DEVELOPER_VIEW_OVERLAY_KEY, false)
  return { isDeveloperView, isOverlayEnabled }
}
