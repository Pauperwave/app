import type { BreadcrumbItem } from '#ui/types'

export const useBreadcrumbs = () => {
  const route = useRoute()

  const transactionTypeLabels: Record<string, string> = {
    'association-fee': 'Quote associative',
    'event-fee': 'Quote eventi',
    'donations': 'Donazioni',
    'refunds': 'Rimborsi'
  }

  const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [
      { label: 'Pannello di controllo', to: '/' }
    ]

    if (route.path.startsWith('/transactions')) {
      items.push({ label: 'Transazioni', to: '/transactions' })

      const type = route.query.type as string
      if (type && transactionTypeLabels[type]) {
        items.push({
          label: transactionTypeLabels[type],
          to: { path: '/transactions', query: { type } }
        })
      }
    }

    return items
  })

  return { breadcrumbItems }
}
