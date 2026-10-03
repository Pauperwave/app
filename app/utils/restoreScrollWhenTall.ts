// app\utils\restoreScrollWhenTall.ts

interface ScrollTarget {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
}

interface Options {
  maxWaitMs?: number
  now?: () => number
  // Runs the callback on a later frame; injectable so a test can step it
  schedule?: (callback: () => void) => void
}

// Sets a scroll position once the element is tall enough to reach it: a page whose content loads
// after mount (queries, images) has nothing to scroll yet when the route renders. Gives up after
// `maxWaitMs`, and as soon as the user has scrolled by themselves.
export function restoreScrollWhenTall(
  getTarget: () => ScrollTarget | null,
  top: number,
  { maxWaitMs = 3000, now = Date.now, schedule = requestAnimationFrame }: Options = {}
) {
  const startedAt = now()

  function attempt() {
    const target = getTarget()
    if (target && target.scrollTop > 0) return

    const reachable = target && target.scrollHeight - target.clientHeight >= top
    if (reachable) {
      target.scrollTop = top
      return
    }

    if (now() - startedAt < maxWaitMs) schedule(attempt)
  }

  schedule(attempt)
}
