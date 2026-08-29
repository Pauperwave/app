// app\composables\wantedCards\useWantedCardsTour.ts

// Step order = the page's reading order (top-left -> bottom-right): navbar (view,
// new request), then toolbar (filters on the left, view on the right), then the page
// body (anatomy of a card), and finally the closing step. Targets are CSS ids on
// real elements of the page template — this avoids having to expose refs for
// components that would not otherwise have them (UFieldGroup, UButton inside
// AddModal.vue).
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
      // Only grid/dense render a card at all (table has no equivalent
      // anchor) — wanted-cards/index.vue watches this field and switches
      // viewMode away from 'table' before this step becomes current, so
      // the popover always has something real to point at (user request,
      // 2026-08-29: "dovrebbe prima accertarsi di essere su quella vista e
      // spostartici").
      requiresCardView: true
    },
    {
      target: null,
      title: t('wantedCard.tour.steps.done.title'),
      description: t('wantedCard.tour.steps.done.description')
    }
  ])
}
