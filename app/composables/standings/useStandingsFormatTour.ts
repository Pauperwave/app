// app\composables\standings\useStandingsFormatTour.ts
export function useStandingsFormatTour() {
  const { t } = useI18n()

  return useTour([
    {
      target: '#tour-standings-league-tabs',
      title: t('standings.tour.steps.leagueTabs.title'),
      description: t('standings.tour.steps.leagueTabs.description'),
      side: 'bottom'
    },
    {
      target: '#tour-standings-public-link',
      title: t('standings.tour.steps.publicLink.title'),
      description: t('standings.tour.steps.publicLink.description'),
      side: 'bottom'
    },
    {
      target: '#tour-standings-content',
      title: t('standings.tour.steps.content.title'),
      description: t('standings.tour.steps.content.description')
    },
    {
      target: null,
      title: t('standings.tour.steps.done.title'),
      description: t('standings.tour.steps.done.description')
    }
  ])
}
