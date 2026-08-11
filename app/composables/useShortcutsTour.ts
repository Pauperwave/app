// app\composables\useShortcutsTour.ts

// Two steps, targeting ids set on default.vue's own sidebar markup (not a
// page): the nav menu (for the "g-x" chords) and the footer row (for the
// bare-letter global actions n/t/b, all wired up right there). Each step's
// `id` field (arbitrary passthrough per useTour) lets default.vue watch
// `tour.current.value?.id` and force the "press g" hint visible for the
// duration of the navigation step, so the tour actually demonstrates it
// instead of just describing it.
//
// `description` holds the i18n KEYPATH, not the resolved string (unlike
// `title`): the key/value pairs it interpolates (g1, a, n, ...) are meant to
// render as real UKbd chips, matching the sidebar's own hint, not plain
// quoted letters — so TourGuide.vue resolves it via <i18n-t> instead of a
// plain t() call here.
export function useShortcutsTour() {
  const { t } = useI18n()

  return useTour([
    {
      id: 'navigation',
      target: '#tour-shortcuts-nav',
      title: t('nav.shortcutsTour.steps.navigation.title'),
      description: 'nav.shortcutsTour.steps.navigation.description'
    },
    {
      id: 'globalActions',
      target: '#tour-shortcuts-global',
      title: t('nav.shortcutsTour.steps.globalActions.title'),
      description: 'nav.shortcutsTour.steps.globalActions.description',
      side: 'top'
    }
  ])
}
