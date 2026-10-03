// app\composables\statistics\useWantedCardsStatistics.ts
import { eachMonthOfInterval, endOfMonth } from 'date-fns'
import type { WantedCardStatus } from '~/types'

export interface WantedCardsStatusPoint {
  status: WantedCardStatus
  count: number
}

export interface WantedCardsStatusOverTimePoint {
  month: Date
  counts: Record<WantedCardStatus, number>
}

// Derives from useWantedCardsQuery's cached list, like
// useAssociatesStatistics.ts/useTournamentsStatistics.ts
export function useWantedCardsStatistics() {
  const { data: wantedCards, isLoading } = useWantedCardsQuery()

  // Fixed order (not by count): searching -> found/abandoned reads as a request's natural
  // progression, like WANTED_CARD_STATUSES
  const statusBreakdown = computed<WantedCardsStatusPoint[]>(() =>
    WANTED_CARD_STATUSES.map(status => ({
      status,
      count: (wantedCards.value ?? []).filter(card => card.status === status).length
    })))

  // The STATE of the whole pile at the end of each month, not "new requests that month colored by
  // where they ended" (which tells when a card was raised, not how the pile evolved). A card is
  // 'found' once its foundAt passed (set by a DB trigger, see WantedCard in app/types/index.d.ts),
  // 'abandoned' once its updatedAt passed AND its status is 'abandoned' (best-effort: no
  // abandonedAt column, so the last update proxies for leaving the pile), else 'searching',
  // including cards found/abandoned later
  const statusOverTimeSeries = computed<WantedCardsStatusOverTimePoint[]>(() => {
    const cards = wantedCards.value ?? []
    if (!cards.length) return []

    const dates = cards.map(card => new Date(card.date)).sort((a, b) => a.getTime() - b.getTime())
    const months = eachMonthOfInterval({ start: dates[0]!, end: new Date() })

    return months.map((month) => {
      const cutoff = endOfMonth(month)
      const counts = { searching: 0, found: 0, abandoned: 0 } as Record<WantedCardStatus, number>

      for (const card of cards) {
        const createdAt = new Date(card.date)
        if (createdAt > cutoff) continue // not requested yet as of this month

        if (card.status === 'found' && card.foundAt && new Date(card.foundAt) <= cutoff) {
          counts.found++
        } else if (card.status === 'abandoned' && new Date(card.updatedAt) <= cutoff) {
          counts.abandoned++
        } else {
          counts.searching++
        }
      }

      return { month, counts }
    })
  })

  return {
    isLoading, statusBreakdown, statusOverTimeSeries
  }
}
