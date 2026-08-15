// app\composables\home\useHomeTour.ts

// Step order = the page's reading order (top-left -> bottom-right): navbar
// (quick create), toolbar (period filters), then the page body (stats,
// chart, sales), and finally the closing step. Targets are CSS ids on real
// elements of the page template — same convention as
// wantedCards/useWantedCardsTour.ts.
export function useHomeTour() {
  const { t } = useI18n()

  return useTour([
    {
      target: '#tour-home-quick-create',
      title: t('home.tour.steps.quickCreate.title'),
      description: t('home.tour.steps.quickCreate.description'),
      side: 'bottom'
    },
    {
      target: '#tour-home-filters',
      title: t('home.tour.steps.filters.title'),
      description: t('home.tour.steps.filters.description')
    },
    {
      target: '#tour-home-stats',
      title: t('home.tour.steps.stats.title'),
      description: t('home.tour.steps.stats.description')
    },
    {
      target: '#tour-home-chart',
      title: t('home.tour.steps.chart.title'),
      description: t('home.tour.steps.chart.description')
    },
    {
      target: '#tour-home-sales',
      title: t('home.tour.steps.sales.title'),
      description: t('home.tour.steps.sales.description')
    },
    {
      target: null,
      title: t('home.tour.steps.done.title'),
      description: t('home.tour.steps.done.description')
    }
  ])
}
