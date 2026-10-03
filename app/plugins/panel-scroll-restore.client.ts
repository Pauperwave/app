// app\plugins\panel-scroll-restore.client.ts

// The dashboard's UDashboardGroup is fixed and clips the window, so a page scrolls inside its
// panel body: vue-router's own scroll restoration only knows the window and never restores it.
const PANEL_BODY = '[id^="dashboard-panel-"] > [data-slot="body"]'

export default defineNuxtPlugin(() => {
  const router = useRouter()
  const positions = new Map<string, number>()
  let navigatingInHistory = false

  const panelBody = () => document.querySelector<HTMLElement>(PANEL_BODY)

  // Back and forward are the only navigations that should land where the page was left
  window.addEventListener('popstate', () => {
    navigatingInHistory = true
  })

  // Saved on the way out: once the navigation completes the old page's DOM is already gone
  router.beforeEach((_to, from) => {
    const body = panelBody()
    if (body) positions.set(from.fullPath, body.scrollTop)
  })

  router.afterEach((to) => {
    const wasHistory = navigatingInHistory
    navigatingInHistory = false

    const top = positions.get(to.fullPath)
    if (wasHistory && top) restoreScrollWhenTall(panelBody, top)
  })
})
