// app\composables\standings\useCittadinoTour.ts
export function useCittadinoTour() {
  const { t } = useI18n()

  return useTour([
    {
      target: '#tour-cittadino-edition-tabs',
      title: t('cittadino.tour.steps.editionTabs.title'),
      description: t('cittadino.tour.steps.editionTabs.description'),
      side: 'bottom'
    },
    {
      target: '#tour-cittadino-public-link',
      title: t('cittadino.tour.steps.publicLink.title'),
      description: t('cittadino.tour.steps.publicLink.description'),
      side: 'bottom'
    },
    {
      target: '#tour-cittadino-filters',
      title: t('cittadino.tour.steps.filters.title'),
      description: t('cittadino.tour.steps.filters.description')
    },
    {
      target: '#tour-cittadino-content',
      title: t('cittadino.tour.steps.content.title'),
      description: t('cittadino.tour.steps.content.description')
    },
    {
      target: null,
      title: t('cittadino.tour.steps.done.title'),
      description: t('cittadino.tour.steps.done.description')
    }
  ])
}
