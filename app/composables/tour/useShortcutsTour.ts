// app\composables\tour\useShortcutsTour.ts

// Two steps targeting ids on default.vue's sidebar markup: the nav menu (the "g-x" chords) and the
// footer row (the bare-letter global actions n/t/b). Each step's `id` (arbitrary passthrough per
// useTour) lets default.vue watch `tour.current.value?.id` and force the "press g" hint visible
// during the navigation step.
//
// `description` holds the i18n KEYPATH, not the resolved string (unlike `title`): its key/value
// pairs (g1, a, n, ...) render as real UKbd chips, so TourGuide.vue resolves it via <i18n-t>
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
