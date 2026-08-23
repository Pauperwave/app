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
        // data-[expanded=true]:[&>td]:border-b-0: an expanded group header row
        // (TanStack sets data-expanded="true" on it) drops its own bottom
        // border — the placeholder row below it (see td, below) is a single
        // 0-height <td colspan> already sitting right where that line would
        // be, so keeping both drew two stacked borders. Removing the header's
        // own border leaves exactly the placeholder's as the one seam between
        // the group header and its first child.
        tr: 'hover:bg-elevated/50 data-[expanded=true]:[&>td]:border-b-0',
        th: 'border-r border-default last:border-r-0 py-1 px-2 font-medium',
        // [&[colspan]]:p-0: TanStack's getGroupedRowModel() renders a
        // near-invisible placeholder <tr><td colspan="N"></td></tr> between a
        // group header row and its first expanded child — Nuxt UI/TanStack
        // expose no option to suppress it, so this collapses its padding via
        // CSS instead. Targets the `colspan` attribute specifically (only
        // TanStack's own placeholder cell has it), not a generic `:empty`
        // selector — an empty *real* cell (e.g. a grouped header row's other
        // columns, which render null while grouped) still needs its normal
        // border to keep that row's border-bottom continuous across its full
        // width; matching on emptiness broke that. App-wide since every
        // grouped table needs it (was per-instance :ui on /wanted-cards and
        // /transactions until 2026-08-13).
        td: 'border-b border-r border-default last:border-r-0 py-1 px-2 [&[colspan]]:p-0'
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
    pageCard: {
      slots: {
        // Root cause of the "short-content cards look vertically centered"
        // bug (Home's equal-height card rows, 2026-08-23): at the lg
        // breakpoint the container switches to `display: grid` with two
        // implicit auto-sized rows (header, body); CSS Grid's default
        // `align-content: normal` behaves as `stretch` for auto-sized
        // tracks, so a card stretched taller than its own content (to match
        // its row's tallest sibling) distributes the extra height onto BOTH
        // rows instead of leaving it after the body — visually pushing
        // everything down/apart rather than pinning it to the top.
        // `content-start` stops that redistribution; verified via
        // getComputedStyle(container).gridTemplateRows collapsing to each
        // row's natural content height instead of splitting the stretched
        // total.
        container: 'relative flex flex-col flex-1 lg:grid content-start gap-x-8 gap-y-4 p-4 sm:p-6'
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
