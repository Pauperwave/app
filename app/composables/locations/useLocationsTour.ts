// app\composables\locations\useLocationsTour.ts
export function useLocationsTour() {
  const { t } = useI18n()

  return useTour([
    {
      target: '#tour-locations-add',
      title: t('location.tour.steps.add.title'),
      description: t('location.tour.steps.add.description'),
      side: 'bottom'
    },
    {
      target: '#tour-locations-view-mode',
      title: t('location.tour.steps.viewMode.title'),
      description: t('location.tour.steps.viewMode.description'),
      side: 'bottom'
    },
    {
      target: '#tour-locations-content',
      title: t('location.tour.steps.content.title'),
      description: t('location.tour.steps.content.description')
    },
    {
      target: null,
      title: t('location.tour.steps.done.title'),
      description: t('location.tour.steps.done.description')
    }
  ])
}
