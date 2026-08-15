// app\composables\leagues\useLeaguesTour.ts
export function useLeaguesTour() {
  const { t } = useI18n()

  return useTour([
    {
      target: '#tour-leagues-view-mode',
      title: t('league.tour.steps.viewMode.title'),
      description: t('league.tour.steps.viewMode.description'),
      side: 'bottom'
    },
    {
      target: '#tour-leagues-add',
      title: t('league.tour.steps.add.title'),
      description: t('league.tour.steps.add.description'),
      side: 'bottom'
    },
    {
      target: '#tour-leagues-filters',
      title: t('league.tour.steps.filters.title'),
      description: t('league.tour.steps.filters.description')
    },
    {
      target: '#tour-leagues-content',
      title: t('league.tour.steps.content.title'),
      description: t('league.tour.steps.content.description')
    },
    {
      target: null,
      title: t('league.tour.steps.done.title'),
      description: t('league.tour.steps.done.description')
    }
  ])
}
