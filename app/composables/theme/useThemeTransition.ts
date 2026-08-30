// app\composables\theme\useThemeTransition.ts
export function useThemeTransition() {
  const colorMode = useColorMode()
  const { isMobile } = useDevice()
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
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )
    // Same fallback as browsers without View Transitions support — on
    // mobile, the address bar can hide/show mid-animation, which throws off
    // the reveal circle's coverage (user report, 2026-08-30). Skip the
    // animated reveal there entirely rather than compensating for it.
    if (!document.startViewTransition || isMobile) {
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
