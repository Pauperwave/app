// app\utils\tabsUi.ts

// Boxed tab style: an outlined container with a soft indicator sliding behind the
// active trigger. Established in NotificationsSlideover.vue, then adopted for the
// cittadino edition picker and the grid/table view switch — extracted here once it
// reached a third copy rather than being pasted again.
//
// Not an app.config.ts `ui.tabs` override on purpose: that would restyle every
// UTabs in the app, including the `variant="link"` tabs on /associates and
// /players, which deliberately look different.
export const BOXED_TABS_UI = {
  list: 'bg-default border border-default rounded-lg p-1',
  trigger: 'grow rounded-lg data-[state=active]:text-primary',
  label: 'whitespace-normal overflow-visible text-clip text-center',
  indicator: 'rounded-md bg-elevated/60'
}
