// app\composables\telegram\useEventTimer.ts
import {
  formatRemaining, resolveRoundTimer,
  type RoundTimerResponse, type RoundTimerSnapshot, type RoundTimerStatus
} from '#shared/utils/tournaments/roundTimerState'

// Realtime tells the page when the organizer changes the timer; this slower re-read is only the
// safety net for a connection that dropped without noticing
const SAFETY_POLL_MS = 60_000

type EventTimerStatus = RoundTimerStatus | 'loading' | 'unavailable'

// Follows the event's round timer for the table the player sits at (read-only: only the organizer
// changes it). Anything but status 'ok' means there is no event timer to follow, and the page
// falls back to its own local one.
export function useEventTimer() {
  const supabase = useSupabaseClient()

  const status = ref<EventTimerStatus>('loading')
  const snapshot = ref<RoundTimerSnapshot | null>(null)
  // Server clock minus this device's, from the last response
  const clockOffsetMs = ref(0)
  const now = useNow({ interval: 1000 })

  const resolved = computed(() => (snapshot.value
    ? resolveRoundTimer(snapshot.value, now.value.getTime() + clockOffsetMs.value)
    : null))
  const isSynced = computed(() => status.value === 'ok' && resolved.value !== null)
  const label = computed(() => formatRemaining(resolved.value?.remainingSeconds ?? 0))

  async function refresh() {
    // Without Telegram's signed initData (opened in a plain browser) there is no one to identify
    const initData = window.Telegram?.WebApp?.initData
    if (!initData) {
      status.value = 'unavailable'
      return
    }

    try {
      const response = await $fetch<RoundTimerResponse>('/api/telegram/round-timer', {
        method: 'POST',
        body: { initData }
      })
      status.value = response.status
      snapshot.value = response.snapshot
      clockOffsetMs.value = response.serverNowMs - Date.now()
      if (response.tournamentUuid !== null && response.roundNumber !== null) {
        listenTo(response.tournamentUuid, response.roundNumber)
      }
    } catch {
      // A failed re-read keeps the last known timer ticking; only a first failure gives up
      if (status.value === 'loading') status.value = 'unavailable'
    }
  }

  // One channel for the round being played. The event is only a signal: the page re-reads the
  // state through the endpoint (same path, same server clock) rather than merging the payload,
  // as the other realtime composables do. Listening starts even before the organizer's first
  // start, which is an INSERT.
  let channel: ReturnType<typeof supabase.channel> | null = null
  let listeningTo = ''

  function listenTo(tournamentUuid: string, roundNumber: number) {
    const key = `${tournamentUuid}:${roundNumber}`
    if (key === listeningTo) return

    if (channel) supabase.removeChannel(channel)
    listeningTo = key
    let firstSubscribe = true

    channel = supabase
      .channel(`round-timer-${key}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_round_timers',
          filter: `tournament_uuid=eq.${tournamentUuid}`
        },
        (payload) => {
          // The filter takes one column: the round is checked here
          const row = payload.new as { round_number?: number }
          if (row.round_number !== roundNumber) return
          telegramHaptic()?.impactOccurred('medium')
          refresh()
        }
      )
      .subscribe((subscription) => {
        // After a reconnection, catch up on what was missed while it was down
        if (subscription === 'SUBSCRIBED' && !firstSubscribe) refresh()
        if (subscription === 'SUBSCRIBED') firstSubscribe = false
      })
  }

  onMounted(refresh)
  useIntervalFn(refresh, SAFETY_POLL_MS)
  // Back from the background (or a locked screen), where the connection may have dropped
  useEventListener(document, 'visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh()
  })
  onUnmounted(() => {
    if (channel) supabase.removeChannel(channel)
  })

  return {
    isLoading: computed(() => status.value === 'loading'),
    isSynced,
    resolved,
    label
  }
}
