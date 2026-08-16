// app\composables\useBreadcrumbs.ts
import type { BreadcrumbItem } from '#ui/types'

// `overrides` maps a raw path segment (e.g. a uuid dynamic route param) to
// its display label — for detail pages like /leagues/[leagueId], where the
// segment is data-driven and can't be derived from the URL the way static
// segments are (formatSegment's hyphen-split+title-case only makes sense for
// route names, not ids). Checked before customLabels, so a page-supplied
// name always wins over a generic static one.
export const useBreadcrumbs = (overrides: MaybeRefOrGetter<Record<string, string>> = {}) => {
  const route = useRoute()
  const { t } = useI18n()

  // Only the names worth customising (optional): first route level -> custom label.
  // Anything missing is formatted automatically (e.g. 'user-profile' -> 'User
  // Profile').
  const customLabels = computed<Record<string, string>>(() => ({
    transactions: t('transaction.breadcrumb'),
    associates: t('associate.breadcrumb'),
    associate: t('associate.breadcrumb'),
    players: t('player.breadcrumb'),
    leagues: t('league.breadcrumb'),
    tournaments: t('tournament.breadcrumb'),
    events: t('event.breadcrumb'),
    statistics: t('statistic.breadcrumb'),
    commanders: t('commander.breadcrumb'),
    rulesets: t('ruleset.breadcrumb')
  }))

  // Query param labels, organised by route
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

  // Helper to format segment names
  const formatSegment = (segment: string): string => {
    return toValue(overrides)[segment] || customLabels.value[segment] || segment.split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Segments whose list page lives under a different name (e.g. the detail sits at
  // /associate/[slug] while the list is at /associates)
  const pathOverrides: Record<string, string> = {
    associate: '/associates'
  }

  const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const segments = route.path.split('/').filter(Boolean)

    const items = segments.reduce<BreadcrumbItem[]>((acc, segment, i) => {
      const path = pathOverrides[segment] ?? ('/' + segments.slice(0, i + 1).join('/'))
      acc.push({
        label: formatSegment(segment),
        to: path
      })
      return acc
    }, [{ label: t('nav.dashboard'), to: '/' }])

    // Query param handling
    const firstSegment = segments[0] // e.g. 'transactions' or 'associates'

    if (firstSegment && queryLabels.value[firstSegment]) {
      const routeQueryLabels = queryLabels.value[firstSegment]

      // Look through every configured query param
      for (const [queryParam, labels] of Object.entries(routeQueryLabels)) {
        const value = route.query[queryParam] as string

        if (value && labels[value]) {
          items.push({
            label: labels[value],
            to: { path: route.path, query: { [queryParam]: value } }
          })
          break // Only show the first query param found
        }
      }
    }

    return items
  })

  return { breadcrumbItems }
}
