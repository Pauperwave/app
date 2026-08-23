// app\composables\finance\useFinanceTour.ts
export function useFinanceTour() {
  const { t } = useI18n()

  return useTour([
    {
      target: '#tour-finance-year',
      title: t('finance.tour.steps.year.title'),
      description: t('finance.tour.steps.year.description'),
      side: 'bottom'
    },
    {
      target: '#tour-finance-card-total',
      title: t('finance.tour.steps.cardTotal.title'),
      description: t('finance.tour.steps.cardTotal.description'),
      side: 'bottom'
    },
    {
      target: '#tour-finance-card-fees',
      title: t('finance.tour.steps.cardFees.title'),
      description: t('finance.tour.steps.cardFees.description'),
      side: 'bottom'
    },
    {
      target: '#tour-finance-card-net',
      title: t('finance.tour.steps.cardNet.title'),
      description: t('finance.tour.steps.cardNet.description'),
      side: 'bottom'
    },
    {
      target: '#tour-finance-card-count',
      title: t('finance.tour.steps.cardCount.title'),
      description: t('finance.tour.steps.cardCount.description'),
      side: 'bottom'
    },
    {
      target: '#tour-finance-card-average',
      title: t('finance.tour.steps.cardAverage.title'),
      description: t('finance.tour.steps.cardAverage.description'),
      side: 'bottom'
    },
    {
      target: '#tour-finance-table-month',
      title: t('finance.tour.steps.tableMonth.title'),
      description: t('finance.tour.steps.tableMonth.description')
    },
    {
      target: '#tour-finance-table-type',
      title: t('finance.tour.steps.tableType.title'),
      description: t('finance.tour.steps.tableType.description')
    },
    {
      target: '#tour-finance-table-format',
      title: t('finance.tour.steps.tableFormat.title'),
      description: t('finance.tour.steps.tableFormat.description')
    },
    {
      target: '#tour-finance-table-tournament',
      title: t('finance.tour.steps.tableTournament.title'),
      description: t('finance.tour.steps.tableTournament.description')
    },
    {
      target: '#tour-finance-table-event',
      title: t('finance.tour.steps.tableEvent.title'),
      description: t('finance.tour.steps.tableEvent.description')
    },
    {
      target: '#tour-finance-costs',
      title: t('finance.tour.steps.costs.title'),
      description: t('finance.tour.steps.costs.description')
    },
    {
      target: null,
      title: t('finance.tour.steps.done.title'),
      description: t('finance.tour.steps.done.description')
    }
  ])
}
