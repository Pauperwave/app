// app\composables\home\useHomeTour.ts
import type { Ref } from 'vue'

// Step order = the page's reading order (top-left -> bottom-right): navbar
// (quick create, staff only), then the page body, then the closing step.
// `steps` is a computed (not a plain array) since useTour's own `steps`
// param accepts a getter (toValue-unwrapped internally) — the quick-create
// step only exists for staff, and isStaff can flip mid-session via "view as"
// (useUserRole.ts), so the tour must react to it rather than freeze at
// whichever role was active when the tour was first built.
export function useHomeTour(isStaff: Ref<boolean>) {
  const { t } = useI18n()

  const steps = computed(() => [
    ...(isStaff.value
      ? [{
        target: '#tour-home-quick-create',
        title: t('home.tour.steps.quickCreate.title'),
        description: t('home.tour.steps.quickCreate.description')
      }]
      : []),
    {
      target: '#tour-home-body',
      title: t('home.tour.steps.body.title'),
      description: t(`home.tour.steps.body.description${isStaff.value ? 'Staff' : 'Player'}`)
    },
    {
      target: null,
      title: t('home.tour.steps.done.title'),
      description: t('home.tour.steps.done.description')
    }
  ])

  return useTour(steps)
}
