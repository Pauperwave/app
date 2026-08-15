// app\composables\associates\useAssociatesTour.ts

// Scoped to /associates (the roster) — /associates/requests is a sibling
// route with its own tour, not covered here (see SubNav.vue's own comment
// on why the two pages don't share a layout). Step order = the page's
// reading order (top-left -> bottom-right): navbar (view mode), sub-nav,
// toolbar (filters left, actions right), then the table itself.
export function useAssociatesTour() {
  const { t } = useI18n()

  return useTour([
    {
      target: '#tour-associates-view-mode',
      title: t('associate.tour.steps.viewMode.title'),
      description: t('associate.tour.steps.viewMode.description'),
      side: 'bottom'
    },
    {
      target: '#tour-associates-subnav',
      title: t('associate.tour.steps.subNav.title'),
      description: t('associate.tour.steps.subNav.description')
    },
    {
      target: '#tour-associates-filters',
      title: t('associate.tour.steps.filters.title'),
      description: t('associate.tour.steps.filters.description')
    },
    {
      target: '#tour-associates-actions',
      title: t('associate.tour.steps.actions.title'),
      description: t('associate.tour.steps.actions.description')
    },
    {
      target: '#tour-associates-table',
      title: t('associate.tour.steps.table.title'),
      description: t('associate.tour.steps.table.description')
    },
    {
      target: null,
      title: t('associate.tour.steps.done.title'),
      description: t('associate.tour.steps.done.description')
    }
  ])
}
