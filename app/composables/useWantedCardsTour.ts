// app\composables\useWantedCardsTour.ts

// Ordine degli step = ordine di lettura della pagina (alto-sinistra ->
// basso-destra): navbar (vista, nuova richiesta), poi toolbar (filtri a
// sinistra, vista a destra), poi il corpo pagina (anatomia di una card),
// infine lo step di chiusura. I target sono id CSS su elementi reali del
// template della pagina — evita di dover esporre ref per componenti che non
// li avrebbero altrimenti (UFieldGroup, UButton dentro AddModal.vue).
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
      side: 'right'
    },
    {
      target: null,
      title: t('wantedCard.tour.steps.done.title'),
      description: t('wantedCard.tour.steps.done.description')
    }
  ])
}
