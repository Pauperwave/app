// app\composables\statistics\useStatisticsTour.ts

// Step order = the page's reading order (top -> bottom): navbar (start
// button), stats row, then one step per chart — each chart tells a
// different story, so it gets its own stop rather than being grouped with
// its neighbors. Targets are CSS ids on real elements of the page template
// — same convention as home/useHomeTour.ts.
export function useStatisticsTour() {
  const { t } = useI18n()

  return useTour([
    {
      target: '#tour-statistics-stats',
      title: t('statistic.tour.steps.stats.title'),
      description: t('statistic.tour.steps.stats.description')
    },
    {
      target: '#tour-statistics-growth',
      title: t('statistic.tour.steps.growth.title'),
      description: t('statistic.tour.steps.growth.description')
    },
    {
      target: '#tour-statistics-age-distribution',
      title: t('statistic.tour.steps.ageDistribution.title'),
      description: t('statistic.tour.steps.ageDistribution.description')
    },
    {
      target: '#tour-statistics-renewal-timing',
      title: t('statistic.tour.steps.renewalTiming.title'),
      description: t('statistic.tour.steps.renewalTiming.description')
    },
    {
      target: '#tour-statistics-tournaments-per-year',
      title: t('statistic.tour.steps.tournamentsPerYear.title'),
      description: t('statistic.tour.steps.tournamentsPerYear.description')
    },
    {
      target: '#tour-statistics-wanted-cards-status',
      title: t('statistic.tour.steps.wantedCardsStatus.title'),
      description: t('statistic.tour.steps.wantedCardsStatus.description')
    },
    {
      target: null,
      title: t('statistic.tour.steps.done.title'),
      description: t('statistic.tour.steps.done.description')
    }
  ])
}
