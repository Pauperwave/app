// app\composables\useTourSpotlight.ts
import type { UseTourReturn } from '@nuxt/ui/composables'

const DEFAULT_PADDING = 8
const DEFAULT_DIM_COLOR = 'rgb(0 0 0 / 0.6)'

export interface UseTourSpotlightOptions {
  /** Extra space (px) around the target's bounding rect. @default 8 */
  padding?: number
  /**
   * CSS color for the dimmed area. Any valid CSS color works, including a
   * theme token (e.g. `var(--ui-bg-inverted)`).
   * @default 'rgb(0 0 0 / 0.6)'
   */
  dimColor?: string
}

// reka-ui's ReferenceElement.getBoundingClientRect() can return a real
// DOMRect or a plain object (virtual elements) — only these fields are
// actually used here, so this avoids fighting the union type.
interface Rect {
  top: number
  left: number
  width: number
  height: number
}

// useTour (Nuxt UI) anchors only the Popover — it doesn't dim the rest of
// the page around the highlighted element. This wraps a tour instance to
// track the current target's bounding rect and derive a spotlight overlay
// style, recomputed on step change, target resize (ResizeObserver, for
// content reflow the window never sees), and window resize/scroll (capture
// phase, since the target may live inside a scrollable container).
export function useTourSpotlight(tour: UseTourReturn, options: UseTourSpotlightOptions = {}) {
  const padding = options.padding ?? DEFAULT_PADDING
  const dimColor = options.dimColor ?? DEFAULT_DIM_COLOR

  const highlightRect = ref<Rect | null>(null)

  function update() {
    const target = tour.reference.value
    highlightRect.value = target && 'getBoundingClientRect' in target
      ? target.getBoundingClientRect()
      : null
  }

  const throttledUpdate = useThrottleFn(update, 50)

  // Only real DOM elements can be observed — virtual/CSS-selector-resolved
  // references that turn out non-Element (or the centered null-target step)
  // just skip it.
  const resizeObserver = import.meta.client ? new ResizeObserver(update) : null
  onScopeDispose(() => resizeObserver?.disconnect())

  // Single watcher instead of two: re-binds the observer to the new target
  // and recomputes the rect in the same tick, on every step change (or when
  // the same step's target resolves to a different element, e.g. a v-if
  // swap) — avoids two independently-ordered watcher callbacks for what is
  // really one "target changed" event.
  watch(
    [() => tour.index.value, () => tour.open.value, () => tour.reference.value],
    () => {
      const target = tour.reference.value
      resizeObserver?.disconnect()
      // `Element` is a browser global, undefined during SSR — short-circuit
      // on resizeObserver (already client-only via import.meta.client) so
      // `instanceof Element` is never evaluated server-side.
      if (resizeObserver && target instanceof Element) resizeObserver.observe(target)
      nextTick(update)
    },
    { immediate: true }
  )
  // resize fires far less often than scroll, so it's left unthrottled.
  useEventListener(window, 'resize', update)
  useEventListener(window, 'scroll', throttledUpdate, true)

  // Step senza target (centrato, es. lo step finale): nessun rettangolo da
  // bucare — invece di passare a un box pieno-schermo con backgroundColor
  // (proprietà diversa da boxShadow, la transizione CSS non può interpolare
  // tra le due e "salta" in modo brusco), si usa un box largo 0 al centro
  // del viewport con lo stesso box-shadow: lo spread di 9999px copre
  // comunque tutto lo schermo, ma top/left/width/height restano le uniche
  // proprietà che cambiano, quindi la transizione resta fluida.
  const spotlightStyle = computed(() => {
    const rect = highlightRect.value
    const box = rect
      ? {
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2
      }
      : {
        top: (import.meta.client ? window.innerHeight : 0) / 2,
        left: (import.meta.client ? window.innerWidth : 0) / 2,
        width: 0,
        height: 0
      }
    return {
      top: `${box.top}px`,
      left: `${box.left}px`,
      width: `${box.width}px`,
      height: `${box.height}px`,
      boxShadow: `0 0 0 9999px ${dimColor}`
    }
  })

  return { highlightRect, spotlightStyle, update }
}
