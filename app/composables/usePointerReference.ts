// app\composables\usePointerReference.ts
// Shared by CardHoverPreview.vue and CalendarHeatmap.vue: a virtual UTooltip `:reference` that
// follows the pointer instead of anchoring to a DOM element. CardHoverPreview.vue needs it because
// pointer events inside Reka's listbox (under USelectMenu) are intercepted before a real
// TooltipTrigger; CalendarHeatmap.vue because a tooltip/popover per grid cell (373+ in a 12-month
// grid) was janky: one shared tooltip anchored to the pointer, content swapped on hover. `anchor`
// is exposed because callers set it from their own pointer/focus handlers
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
