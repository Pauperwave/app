export default defineAppConfig({
  ui: {
    colors: {
      primary: 'indigo',
      secondary: 'pink',
      neutral: 'zinc',
      success: 'lime',
      info: 'cyan',
      warning: 'yellow',
      error: 'rose'
    },
    dashboardPanel: {
      slots: {
        root: 'relative flex flex-col min-w-0 min-h-[calc(100svh-2rem)] lg:not-last:border-e lg:not-last:border-default shrink-0 lg:rounded-xl lg:border lg:border-default lg:m-4 overflow-hidden bg-muted dark:bg-muted/40'
      }
    },
    navigationMenu: {
      slots: {
        root: 'gap-4',
        label: 'w-full flex items-center gap-1.5 uppercase text-dimmed/80 text-xs font-bold tracking-tight px-2.5 pt-4 pb-1',
        separator: 'hidden'
      }
    }
  }
})
