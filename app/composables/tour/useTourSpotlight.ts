// app\composables\tour\useTourSpotlight.ts
import type { UseTourReturn } from '@nuxt/ui/composables'

const DEFAULT_PADDING = 8
const DEFAULT_DIM_COLOR = 'rgb(0 0 0 / 0.6)'

export interface UseTourSpotlightOptions {
  /** Extra space (px) around the target's bounding rect. @default 8 */
  padding?: number
  /**
   * CSS color for the dimmed area, including a theme token (e.g. `var(--ui-bg-inverted)`). @default
   * 'rgb(0 0 0 / 0.6)'
   */
  dimColor?: string
}

// reka-ui's ReferenceElement.getBoundingClientRect() returns a real DOMRect or a plain object
// (virtual elements): only these fields are used
interface Rect {
  top: number
  left: number
  width: number
  height: number
}

// useTour (Nuxt UI) anchors only the Popover and doesn't dim the page. This wraps a tour to track
// the target's bounding rect and derive a spotlight overlay style, recomputed on step change,
// target resize (ResizeObserver, for reflow the window never sees) and window resize/scroll
// (capture phase, since the target may sit in a scrollable container)
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

  // Only real DOM elements can be observed: virtual/non-Element references (or the centered
  // null-target step) skip it
  const resizeObserver = import.meta.client ? new ResizeObserver(update) : null
  onScopeDispose(() => resizeObserver?.disconnect())

  // A single watcher re-binds the observer and recomputes the rect in the same tick on every
  // "target changed" event (step change, or the same step resolving to another element, e.g. a v-if
  // swap), avoiding two independently-ordered watchers
  watch(
    [() => tour.index.value, () => tour.open.value, () => tour.reference.value],
    () => {
      const target = tour.reference.value
      resizeObserver?.disconnect()
      // `Element` is undefined during SSR: short-circuit on resizeObserver (client-only) so
      // `instanceof Element` never runs server-side
      if (resizeObserver && target instanceof Element) resizeObserver.observe(target)
      nextTick(update)
    },
    { immediate: true }
  )
  // resize fires far less often than scroll, so it's left unthrottled.
  useEventListener(window, 'resize', update)
  useEventListener(window, 'scroll', throttledUpdate, true)

  // Step with no target (centered, e.g. the final one): instead of a full-screen box with
  // backgroundColor (a different property from boxShadow, so the transition jumps), a zero-width
  // box at the viewport center keeps the same box-shadow (the 9999px spread still covers the
  // screen), so only top/left/width/height change and the transition stays smooth
  const spotlightStyle = computed(() => {
    const rect = highlightRect.value
    // Nuxt UI's null-target anchor is a virtual element whose getBoundingClientRect() already
    // reports 0 width/height at the viewport center (not the `null` update() returns when
    // `reference` is absent): skip padding for it too, or the paddings turn it into a 16x16 box
    // that `rounded-lg` renders as a circle
    const hasArea = rect && (rect.width > 0 || rect.height > 0)
    const box = hasArea
      ? {
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2
      }
      : {
        top: rect ? rect.top : (import.meta.client ? window.innerHeight : 0) / 2,
        left: rect ? rect.left : (import.meta.client ? window.innerWidth : 0) / 2,
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
