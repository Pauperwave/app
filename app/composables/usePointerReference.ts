// app\composables\usePointerReference.ts
// Extracted out of CardHoverPreview.vue and CalendarHeatmap.vue (2026-08-29,
// fallow:dupes) — both independently built a virtual UTooltip `:reference`
// that follows the pointer instead of anchoring to a real DOM element, for
// the same two reasons: CardHoverPreview.vue needs it because pointer events
// inside Reka's listbox (underneath USelectMenu) are intercepted before
// reaching a real TooltipTrigger, so the built-in hover trigger never fires;
// CalendarHeatmap.vue needs it because mounting a real tooltip/popover per
// grid cell (373+ instances for a 12-month grid) was visibly janky — one
// shared tooltip anchored to the pointer position, with its content swapped
// on hover, costs nothing per cell. `anchor` is intentionally exposed, not
// just `reference`: callers set it from their own pointer/focus handlers,
// which differ enough (single element vs. per-cell, keyboard-focus fallback
// or not) to stay local rather than being folded in here too.
export function usePointerReference() {
  const anchor = ref({ x: 0, y: 0 })

  const reference = computed(() => ({
    getBoundingClientRect: () => ({
      width: 0,
      height: 0,
      left: anchor.value.x,
      right: anchor.value.x,
      top: anchor.value.y,
      bottom: anchor.value.y,
      ...anchor.value
    } as DOMRect)
  }))

  return { anchor, reference }
}
