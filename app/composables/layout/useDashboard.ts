// app\composables\layout\useDashboard.ts
import { createSharedComposable } from '@vueuse/core'

const _useDashboard = () => {
  const route = useRoute()
  const router = useRouter()
  const isNotificationsSlideoverOpen = ref(false)

  // "g-x" chords for navigation (like GitHub's shortcuts), not bare letters: with 20+ destinations
  // single letters run out and collide, also with the non-navigation actions below (n/b); see
  // docs/architecture/shortcuts.md. Built from NAV_SHORTCUTS (route -> chord), so this registration
  // and the sidebar's "press g" hint (default.vue) can't drift apart
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
