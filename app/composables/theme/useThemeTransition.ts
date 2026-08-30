// app\composables\theme\useThemeTransition.ts
export function useThemeTransition() {
  const colorMode = useColorMode()
  const isDark = computed({
    get() {
      return colorMode.value === 'dark'
    },
    set(val) {
      colorMode.preference = val ? 'dark' : 'light'
    }
  })
  async function toggleTheme(event: MouseEvent) {
    const x = event.clientX
    const y = event.clientY
    // Mobile browsers can hide/show their address bar mid-animation (the
    // transition runs ~500ms), changing window.innerWidth/innerHeight while
    // it's in flight — a radius sized only to the viewport measured at
    // click time can then undershoot once the bar hides and the viewport
    // grows, leaving a sliver of the old theme visible at the edge
    // (reported 2026-08-30 as "starts from the wrong point" + lag on
    // mobile). window.screen.width/height is the toolbar's upper bound —
    // the visible viewport can grow at most to the physical screen size,
    // never past it — so sizing the circle against that guarantees full
    // coverage regardless of the toolbar's state during the animation.
    const viewportWidth = Math.max(window.innerWidth, window.screen.width)
    const viewportHeight = Math.max(window.innerHeight, window.screen.height)
    const endRadius = Math.hypot(
      Math.max(x, viewportWidth - x),
      Math.max(y, viewportHeight - y)
    )
    if (!document.startViewTransition) {
      isDark.value = !isDark.value
      return
    }
    const transition = document.startViewTransition(() => {
      isDark.value = !isDark.value
    })
    await transition.ready
    document.documentElement.animate(
      {
        clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`]
      },
      {
        duration: 500,
        easing: 'ease-in-out',
        pseudoElement: '::view-transition-new(root)'
      }
    )
  }
  return { isDark, toggleTheme }
}
