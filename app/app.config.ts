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
        root: '[scrollbar-gutter:stable]',
        // App-wide data-grid look (bordered cells, hover row highlight.
        base: 'border-separate border-spacing-0',
        tbody: '[&>tr]:last:[&>td]:border-b-0',
        tr: 'hover:bg-elevated/50',
        th: 'border-r border-default last:border-r-0 py-2 px-2 font-medium',
        td: 'border-b border-r border-default last:border-r-0 py-1 px-2'
      }
    },
    button: {
      slots: {
        // Nuxt UI's <button> doesn't get cursor:pointer by default (that's
        // the browser default too — only <a> gets it natively). Applies to
        // every UButton app-wide, not just one instance.
        base: 'cursor-pointer'
      }
    },
    navigationMenu: {
      slots: {
        // Was gap-4/pt-4 — with 6 sidebar sections now (Classifiche added
        // 2026-08-09) the two stacked 16px gaps between groups made the
        // sidebar feel sparse. Halved both.
        root: 'gap-2',
        label: 'w-full flex items-center gap-1.5 uppercase text-dimmed/80 text-xs font-bold tracking-tight px-2.5 pt-2 pb-1',
        separator: 'hidden',
        // Matches the reference demo's icon-to-label spacing (mr-2 on the
        // icon + the link's own gap-1.5 = 14px total), not Nuxt UI's default.
        linkLeadingIcon: 'mr-2'
      }
    }
  }
})
