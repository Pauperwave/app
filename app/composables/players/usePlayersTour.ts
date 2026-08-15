// app\composables\players\usePlayersTour.ts
export function usePlayersTour() {
  const { t } = useI18n()

  return useTour([
    {
      target: '#tour-players-filters',
      title: t('player.tour.steps.filters.title'),
      description: t('player.tour.steps.filters.description'),
      side: 'bottom'
    },
    {
      target: '#tour-players-actions',
      title: t('player.tour.steps.actions.title'),
      description: t('player.tour.steps.actions.description'),
      side: 'bottom'
    },
    {
      target: null,
      title: t('player.tour.steps.done.title'),
      description: t('player.tour.steps.done.description')
    }
  ])
}
