// app\composables\home\useHomeTour.ts
import type { Ref } from 'vue'

// One step per chart/section (issue #55, user request 2026-08-22) — was a
// single coarse step covering the whole dashboard body, too shallow to
// actually explain anything. Same convention as useStatisticsTour.ts:
// step order = the page's own reading order (top-left -> bottom-right),
// targets are CSS ids on real elements of home/Staff.vue/home/Player.vue.
// `steps` stays a computed (not a plain array) since useTour's own `steps`
// param accepts a getter (toValue-unwrapped internally) — the quick-create
// step and the staff/player section split only exist for the resolved role,
// and isStaff can flip mid-session via "view as" (useUserRole.ts), so the
// tour must react to it rather than freeze at whichever role was active
// when the tour was first built.
export function useHomeTour(isStaff: Ref<boolean>) {
  const { t } = useI18n()

  const staffSteps = [
    {
      target: '#tour-home-stats',
      title: t('home.tour.steps.stats.title'),
      description: t('home.tour.steps.stats.description')
    },
    {
      target: '#tour-home-pending-actions',
      title: t('home.tour.steps.pendingActions.title'),
      description: t('home.tour.steps.pendingActions.description')
    },
    {
      target: '#tour-home-upcoming',
      title: t('home.tour.steps.upcomingStaff.title'),
      description: t('home.tour.steps.upcomingStaff.description')
    },
    {
      target: '#tour-home-recent-transactions',
      title: t('home.tour.steps.recentTransactions.title'),
      description: t('home.tour.steps.recentTransactions.description')
    },
    {
      target: '#tour-home-recent-associates',
      title: t('home.tour.steps.recentAssociates.title'),
      description: t('home.tour.steps.recentAssociates.description')
    },
    {
      target: '#tour-home-next-location',
      title: t('home.tour.steps.nextLocation.title'),
      description: t('home.tour.steps.nextLocation.description')
    },
    {
      target: '#tour-home-active-leagues',
      title: t('home.tour.steps.activeLeagues.title'),
      description: t('home.tour.steps.activeLeagues.description')
    }
  ]

  const playerSteps = [
    {
      target: '#tour-home-membership',
      title: t('home.tour.steps.membership.title'),
      description: t('home.tour.steps.membership.description')
    },
    {
      target: '#tour-home-payments',
      title: t('home.tour.steps.payments.title'),
      description: t('home.tour.steps.payments.description')
    },
    {
      target: '#tour-home-upcoming',
      title: t('home.tour.steps.upcomingPlayer.title'),
      description: t('home.tour.steps.upcomingPlayer.description')
    },
    {
      target: '#tour-home-rankings',
      title: t('home.tour.steps.rankings.title'),
      description: t('home.tour.steps.rankings.description')
    }
  ]

  const steps = computed(() => [
    ...(isStaff.value
      ? [{
        target: '#tour-home-quick-create',
        title: t('home.tour.steps.quickCreate.title'),
        description: t('home.tour.steps.quickCreate.description')
      }]
      : []),
    ...(isStaff.value ? staffSteps : playerSteps),
    {
      target: null,
      title: t('home.tour.steps.done.title'),
      description: t('home.tour.steps.done.description')
    }
  ])

  return useTour(steps)
}
