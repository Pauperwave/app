// app\app.config.ts
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
        // Nuxt UI's default, minus the left border (`border` -> `border-y
        // border-r`): the sidebar already has its own `border-e` right next
        // to it, so a left border here was a redundant double line.
        root: 'relative flex flex-col min-w-0 min-h-[calc(100svh-2rem)] lg:not-last:border-e lg:not-last:border-default shrink-0 lg:rounded-xl lg:border-y lg:border-r lg:border-default lg:m-4 overflow-hidden bg-muted dark:bg-muted/40',
        // Less top padding between the header/toolbar and the body content
        // than Nuxt UI's default (p-4 sm:p-6) — applies to every dashboard
        // page, not just one, for a consistent tighter header-to-content gap.
        body: 'pt-2 sm:pt-3'
      }
    },
    table: {
      slots: {
        // Reserves the vertical scrollbar's gutter even when a table's rows
        // don't overflow, so the table's right edge doesn't shift a
        // scrollbar-width (~16px) depending on row count/filters.
        root: '[scrollbar-gutter:stable]'
      }
    },
    navigationMenu: {
      slots: {
        root: 'gap-4',
        label: 'w-full flex items-center gap-1.5 uppercase text-dimmed/80 text-xs font-bold tracking-tight px-2.5 pt-4 pb-1',
        separator: 'hidden',
        // Matches the reference demo's icon-to-label spacing (mr-2 on the
        // icon + the link's own gap-1.5 = 14px total), not Nuxt UI's default.
        linkLeadingIcon: 'mr-2'
      }
    }
  }
})
