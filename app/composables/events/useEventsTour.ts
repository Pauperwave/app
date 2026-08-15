// app\composables\events\useEventsTour.ts
export function useEventsTour() {
  const { t } = useI18n()

  return useTour([
    {
      target: '#tour-events-view-mode',
      title: t('event.tour.steps.viewMode.title'),
      description: t('event.tour.steps.viewMode.description'),
      side: 'bottom'
    },
    {
      target: '#tour-events-add',
      title: t('event.tour.steps.add.title'),
      description: t('event.tour.steps.add.description'),
      side: 'bottom'
    },
    {
      target: '#tour-events-filters',
      title: t('event.tour.steps.filters.title'),
      description: t('event.tour.steps.filters.description')
    },
    {
      target: '#tour-events-actions',
      title: t('event.tour.steps.actions.title'),
      description: t('event.tour.steps.actions.description')
    },
    {
      target: '#tour-events-content',
      title: t('event.tour.steps.content.title'),
      description: t('event.tour.steps.content.description')
    },
    {
      target: null,
      title: t('event.tour.steps.done.title'),
      description: t('event.tour.steps.done.description')
    }
  ])
}
