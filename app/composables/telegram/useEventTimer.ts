// app\composables\telegram\useEventTimer.ts
import {
  formatRemaining, resolveRoundTimer,
  type RoundTimerResponse, type RoundTimerSnapshot, type RoundTimerStatus
} from '#shared/utils/tournaments/roundTimerState'

// How often the organizer's timer is re-read; in between, the countdown ticks locally
const POLL_MS = 15_000

type EventTimerStatus = RoundTimerStatus | 'loading' | 'unavailable'

// Follows the event's round timer for the table the player sits at (read-only: only the organizer
// changes it). Anything but status 'ok' means there is no event timer to follow, and the page
// falls back to its own local one.
export function useEventTimer() {
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
    } catch {
      // A failed poll keeps the last known timer ticking; only a first failure gives up
      if (status.value === 'loading') status.value = 'unavailable'
    }
  }

  onMounted(refresh)
  useIntervalFn(refresh, POLL_MS)

  return {
    isLoading: computed(() => status.value === 'loading'),
    isSynced,
    resolved,
    label
  }
}
