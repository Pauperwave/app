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
        // Nuxt UI's default minus the left border (`border` -> `border-y border-r`): the sidebar
        // already has `border-e`
        root: 'relative flex flex-col min-w-0 min-h-[calc(100svh-2rem)] lg:not-last:border-e lg:not-last:border-default shrink-0 lg:rounded-xl lg:border-y lg:border-r lg:border-default lg:m-4 overflow-hidden bg-muted dark:bg-muted/40',
        // Tighter header-to-content gap than Nuxt UI's default (p-4 sm:p-6), on every dashboard
        // page
        body: 'pt-2 sm:pt-3'
      }
    },
    table: {
      slots: {
        // Reserves the scrollbar gutter so the table's right edge doesn't shift with row
        // count/filters
        root: '[scrollbar-gutter:stable]',
        // App-wide data-grid look (bordered cells, hover row highlight)
        base: 'border-separate border-spacing-0',
        tbody: '[&>tr]:last:[&>td]:border-b-0',
        // data-[expanded=true]:[&>td]:border-b-0: an expanded group header (data-expanded="true")
        // drops its own bottom border, since the 0-height placeholder row below already draws the
        // seam (otherwise two stacked borders)
        tr: 'hover:bg-elevated/50 data-[expanded=true]:[&>td]:border-b-0',
        th: 'border-r border-default last:border-r-0 py-1 px-2 font-medium',
        // [&[colspan]]:p-0 collapses the near-invisible placeholder <tr><td colspan="N"> that
        // TanStack's getGroupedRowModel() renders between a group header and its first child (no
        // option to suppress it). Targets `colspan`, not `:empty`: an empty real cell must keep its
        // border to stay continuous across the row
        td: 'border-b border-r border-default last:border-r-0 py-1 px-2 [&[colspan]]:p-0'
      }
    },
    button: {
      slots: {
        // Nuxt UI's <button> has no cursor:pointer by default; applies to every UButton
        base: 'cursor-pointer'
      }
    },
    pageCard: {
      slots: {
        // `content-start` fixes short-content cards looking vertically centered: at lg the
        // container is a grid with two auto-sized rows, whose default `align-content: normal`
        // stretches them, so a card stretched to match its taller sibling would spread the extra
        // height over both rows instead of pinning content to the top
        container: 'relative flex flex-col flex-1 lg:grid content-start gap-x-8 gap-y-4 p-4 sm:p-6'
      }
    },
    navigationMenu: {
      slots: {
        // Halved from gap-4/pt-4: with 6 sidebar sections the stacked gaps made the sidebar feel
        // sparse
        root: 'gap-2',
        label: 'w-full flex items-center gap-1.5 uppercase text-dimmed/80 text-xs font-bold tracking-tight px-2.5 pt-2 pb-1',
        separator: 'hidden',
        // Matches the reference demo's icon-to-label spacing (mr-2 + the link's gap-1.5), not Nuxt
        // UI's default
        linkLeadingIcon: 'mr-2'
      }
    }
  }
})
