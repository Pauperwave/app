import type { BreadcrumbItem } from '#ui/types'

export const useBreadcrumbs = () => {
  const route = useRoute()

  // Solo i nomi che vuoi personalizzare (opzionale)
  const customLabels: Record<string, string> = {
    transactions: 'Transazioni',
    associates: 'Associati'
  }

  // Labels per i query params organizzati per route
  const queryLabels: Record<string, Record<string, Record<string, string>>> = {
    transactions: {
      type: {
        'association-fee': 'Quote associative',
        'event-fee': 'Quote eventi',
        'donations': 'Donazioni',
        'refunds': 'Rimborsi'
      }
    },
    associates: {
      status: {
        waiting: 'Da approvare',
        active: 'Attivi',
        expired: 'Da rinnovare'
      }
    }
  }

  // Funzione helper per formattare nomi
  const formatSegment = (segment: string): string => {
    return customLabels[segment] || segment.split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const segments = route.path.split('/').filter(Boolean)

    const items = segments.reduce<BreadcrumbItem[]>((acc, segment, i) => {
      const path = '/' + segments.slice(0, i + 1).join('/')
      acc.push({
        label: formatSegment(segment),
        to: path
      })
      return acc
    }, [{ label: 'Pannello di controllo', to: '/' }])

    // Gestione query params
    const firstSegment = segments[0] // es: 'transactions' o 'associates'

    if (firstSegment && queryLabels[firstSegment]) {
      const routeQueryLabels = queryLabels[firstSegment]

      // Cerca in tutti i possibili query params configurati
      for (const [queryParam, labels] of Object.entries(routeQueryLabels)) {
        const value = route.query[queryParam] as string

        if (value && labels[value]) {
          items.push({
            label: labels[value],
            to: { path: route.path, query: { [queryParam]: value } }
          })
          break // Mostra solo il primo query param trovato
        }
      }
    }

    return items
  })

  return { breadcrumbItems }
}
