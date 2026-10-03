// app\composables\wantedCards\useWantedCardsTour.ts

// Step order = the page's reading order (top-left -> bottom-right): navbar (view, new request),
// toolbar (filters left, view right), page body (anatomy of a card), closing step. Targets are CSS
// ids on real page elements, avoiding refs for components without them (UFieldGroup, UButton inside
// AddModal.vue)
export function useWantedCardsTour() {
  const { t } = useI18n()

  return useTour([
    {
      target: '#tour-wanted-cards-view-mode',
      title: t('wantedCard.tour.steps.viewMode.title'),
      description: t('wantedCard.tour.steps.viewMode.description')
    },
    {
      target: '#tour-wanted-cards-add',
      title: t('wantedCard.tour.steps.add.title'),
      description: t('wantedCard.tour.steps.add.description'),
      side: 'bottom'
    },
    {
      target: '#tour-wanted-cards-filters',
      title: t('wantedCard.tour.steps.filters.title'),
      description: t('wantedCard.tour.steps.filters.description')
    },
    {
      target: '#tour-wanted-cards-view-controls',
      title: t('wantedCard.tour.steps.viewControls.title'),
      description: t('wantedCard.tour.steps.viewControls.description')
    },
    {
      target: '#tour-wanted-cards-first-card',
      title: t('wantedCard.tour.steps.cardAnatomy.title'),
      description: t('wantedCard.tour.steps.cardAnatomy.description'),
      side: 'right',
      // Only grid/dense render a card (table has no anchor): wanted-cards/index.vue watches this
      // field and switches viewMode away from 'table' before this step becomes current, so the
      // popover has a target
      requiresCardView: true
    },
    {
      target: null,
      title: t('wantedCard.tour.steps.done.title'),
      description: t('wantedCard.tour.steps.done.description')
    }
  ])
}
