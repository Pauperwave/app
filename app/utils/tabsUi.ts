// app\utils\tabsUi.ts

// Boxed tab style: an outlined container with a soft indicator sliding behind the active trigger
// (from NotificationsSlideover.vue, shared by the cittadino edition picker and the grid/table
// switch).
//
// Not an app.config.ts `ui.tabs` override: that would restyle every UTabs, including the
// deliberately different `variant="link"` tabs on /associates and /players
export const BOXED_TABS_UI = {
  list: 'bg-default border border-default rounded-lg p-1',
  trigger: 'grow rounded-lg data-[state=active]:text-primary',
  label: 'whitespace-normal overflow-visible text-clip text-center',
  indicator: 'rounded-md bg-elevated/60'
}
