// app\composables\associates\useAssociatesRequestsTour.ts

// Scoped to /associates/requests — the triage queue, distinct from
// useAssociatesTour.ts (the roster's own tour). Step order = the page's
// reading order (top-left -> bottom-right): navbar (add, public links),
// sub-nav, toolbar (status filter), then the table itself.
export function useAssociatesRequestsTour() {
  const { t } = useI18n()

  return useTour([
    {
      target: '#tour-requests-add',
      title: t('associate.requestsTour.steps.add.title'),
      description: t('associate.requestsTour.steps.add.description'),
      side: 'bottom'
    },
    {
      target: '#tour-requests-links',
      title: t('associate.requestsTour.steps.links.title'),
      description: t('associate.requestsTour.steps.links.description'),
      side: 'bottom'
    },
    {
      target: '#tour-requests-subnav',
      title: t('associate.requestsTour.steps.subNav.title'),
      description: t('associate.requestsTour.steps.subNav.description')
    },
    {
      target: '#tour-requests-filters',
      title: t('associate.requestsTour.steps.filters.title'),
      description: t('associate.requestsTour.steps.filters.description')
    },
    {
      target: '#tour-requests-table',
      title: t('associate.requestsTour.steps.table.title'),
      description: t('associate.requestsTour.steps.table.description')
    },
    {
      target: null,
      title: t('associate.requestsTour.steps.done.title'),
      description: t('associate.requestsTour.steps.done.description')
    }
  ])
}
