import type { BreadcrumbItem } from '#ui/types'

export const useBreadcrumbs = () => {
  const route = useRoute()
  const { t } = useI18n()

  // Solo i nomi che vuoi personalizzare (opzionale)
  // Primo livello della route -> etichetta personalizzata
  // Se non è presente, verrà formattato automaticamente
  // (es: 'user-profile' -> 'User Profile')
  const customLabels = computed<Record<string, string>>(() => ({
    transactions: t('transaction.breadcrumb'),
    associates: t('associate.breadcrumb'),
    players: t('player.breadcrumb'),
    leagues: t('league.breadcrumb'),
    tournaments: t('tournament.breadcrumb'),
    events: t('event.breadcrumb'),
    statistics: t('statistic.breadcrumb'),
    commanders: t('commander.breadcrumb'),
    rulesets: t('ruleset.breadcrumb')
  }))

  // Labels per i query params organizzati per route
  const queryLabels = computed<Record<string, Record<string, Record<string, string>>>>(() => ({
    transactions: {
      type: {
        'association-fee': t('transaction.tabs.associationFee'),
        'event-fee': t('transaction.tabs.eventFee'),
        'donations': t('transaction.tabs.donations')
      }
    },
    associates: {
      status: {
        waiting: t('associate.tabs.pending'),
        active: t('associate.tabs.active'),
        expired: t('associate.tabs.toRenew')
      }
    },
    tournaments: {
      status: {
        upcoming: t('tournament.queryStatus.upcoming'),
        completed: t('tournament.queryStatus.completed')
      }
    }
  }))

  // Funzione helper per formattare nomi
  const formatSegment = (segment: string): string => {
    return customLabels.value[segment] || segment.split('-')
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
    }, [{ label: t('nav.dashboard'), to: '/' }])

    // Gestione query params
    const firstSegment = segments[0] // es: 'transactions' o 'associates'

    if (firstSegment && queryLabels.value[firstSegment]) {
      const routeQueryLabels = queryLabels.value[firstSegment]

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
