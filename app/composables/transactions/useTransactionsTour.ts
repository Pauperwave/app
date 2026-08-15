// app\composables\transactions\useTransactionsTour.ts
export function useTransactionsTour() {
  const { t } = useI18n()

  return useTour([
    {
      target: '#tour-transactions-add',
      title: t('transaction.tour.steps.add.title'),
      description: t('transaction.tour.steps.add.description'),
      side: 'bottom'
    },
    {
      target: '#tour-transactions-filters',
      title: t('transaction.tour.steps.filters.title'),
      description: t('transaction.tour.steps.filters.description')
    },
    {
      target: '#tour-transactions-actions',
      title: t('transaction.tour.steps.actions.title'),
      description: t('transaction.tour.steps.actions.description')
    },
    {
      target: '#tour-transactions-table',
      title: t('transaction.tour.steps.table.title'),
      description: t('transaction.tour.steps.table.description')
    },
    {
      target: null,
      title: t('transaction.tour.steps.done.title'),
      description: t('transaction.tour.steps.done.description')
    }
  ])
}
