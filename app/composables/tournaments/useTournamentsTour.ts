// app\composables\tournaments\useTournamentsTour.ts
export function useTournamentsTour() {
  const { t } = useI18n()

  return useTour([
    {
      target: '#tour-tournaments-view-mode',
      title: t('tournament.tour.steps.viewMode.title'),
      description: t('tournament.tour.steps.viewMode.description'),
      side: 'bottom'
    },
    {
      target: '#tour-tournaments-add',
      title: t('tournament.tour.steps.add.title'),
      description: t('tournament.tour.steps.add.description'),
      side: 'bottom'
    },
    {
      target: '#tour-tournaments-filters',
      title: t('tournament.tour.steps.filters.title'),
      description: t('tournament.tour.steps.filters.description')
    },
    {
      target: '#tour-tournaments-actions',
      title: t('tournament.tour.steps.actions.title'),
      description: t('tournament.tour.steps.actions.description')
    },
    {
      target: '#tour-tournaments-content',
      title: t('tournament.tour.steps.content.title'),
      description: t('tournament.tour.steps.content.description')
    },
    {
      target: null,
      title: t('tournament.tour.steps.done.title'),
      description: t('tournament.tour.steps.done.description')
    }
  ])
}
