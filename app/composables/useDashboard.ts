// app\composables\useDashboard.ts
import { createSharedComposable } from '@vueuse/core'

const _useDashboard = () => {
  const route = useRoute()
  const router = useRouter()
  const isNotificationsSlideoverOpen = ref(false)

  // "g-x" chords for navigation (same convention as GitHub's own shortcuts),
  // not bare letters: with 20+ nav destinations, bare single letters run out
  // and collide fast, both with each other and with the handful of
  // non-navigation single-letter actions below (n/b) — see
  // docs/architecture/shortcuts.md for the full map and the reasoning.
  // Built from NAV_SHORTCUTS (route -> chord) rather than listed here by hand,
  // so this registration and the sidebar's "press g" hint (default.vue) can't
  // drift apart.
  const navChordShortcuts = Object.fromEntries(
    Object.entries(NAV_SHORTCUTS).map(([to, chord]) => [chord, () => router.push(to)])
  )

  defineShortcuts({
    ...navChordShortcuts,
    n: () => isNotificationsSlideoverOpen.value = !isNotificationsSlideoverOpen.value
  })

  watch(() => route.fullPath, () => {
    isNotificationsSlideoverOpen.value = false
  })

  return {
    isNotificationsSlideoverOpen
  }
}

export const useDashboard = createSharedComposable(_useDashboard)
