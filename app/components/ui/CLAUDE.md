# app/components/ui/CLAUDE.md

> an inventory of reusable pieces whose whole value is "check here before hand-rolling a duplicate."

Scoped guidance for `app/components/ui/`. **Check this list before adding a new generic button/modal/filter/tab piece here** — a near-duplicate (another hand-rolled add button, another ad-hoc grid/table toggle) is the signal to reuse or extend one of these instead of hand-rolling. `nuxt.config.ts` sets `pathPrefix: false` here, so component tag names are the filename alone (`<AddButton>`, not `<UiAddButton>`) — **before adding a file, check its name is unique across the whole `app/components` tree**, since `pathPrefix: false` resolves purely by filename and a collision with a domain folder's file would shadow one of them.

If a component needs a specific domain's data/types/copy to make sense, it doesn't belong here — put it in that domain's own folder (`tournaments/`, `locations/`, ...), where the default `pathPrefix: true` avoids the naming-collision problem entirely.

## Pieces here

- **`AddButton`** — the "Nuovo X" trigger button (`label`, `icon`, `@click`) used to open every domain's Add modal. Check here before hand-rolling another primary add button.
- **`EditIconButton`** — the icon-only "edit" button with a hover tooltip (`label`/`size` props, `@click`), used in list tables (rendered via `h()`) and grid cards wherever a row/card has an edit action. Check here before hand-rolling another bare `UButton :icon="ICONS.edit"`.
- **`ConfirmModal`** — a destructive-confirmation dialog (`title`/`description`/`warning`, confirm+cancel with configurable icon/color, optional `#body` slot for item-specific context like a thumbnail+name). Not a generic modal shell — specifically for "are you sure you want to do X" flows.
- **`CopyLinkButton`** — copies a shareable link (e.g. a row's detail-page URL) to the clipboard with a brief confirmation state.
- **`DateWithRelativeTooltip`** — an absolute date (`isoString`, optional `time` prop for date-only vs. date+time) that shows relative time ("3 giorni fa") on hover, via the same `formatDistanceToNow`/`it` locale pattern as `DataFreshnessIndicator.vue`/`wantedCardAge.ts`. Check here before hand-rolling another date-cell formatter for a table column.
- **`CopyOpenLinkPair`** — the `CopyLinkButton` + "open in new tab" `UTooltip`/`UButton` pair used wherever a page links out to its own public counterpart (`url`/`copy-label`/`open-label` props). Check here before hand-rolling another copy+open link pair.
- **`RowActionsMenu`** — the visible per-row "actions" column trigger (ellipsis button + dropdown), fed a table's existing `rowContextMenuItems(row.original)` so the context menu and the visible column share one action list, not two. Check here before hand-rolling another per-row dropdown for a table that only has a right-click context menu today.
- **`ListPageNavbar`** — the `UDashboardNavbar` skeleton every list page uses: sidebar collapse + `QueryRefreshControl` in `#trailing`, a "start tour" button in `#right` (`title`/`tour-label`/`loading`/`status` props, `refresh`/`tour-start` emits). Whatever else a page needs in `#right` (view mode tabs, an add-modal trigger, `NotificationsBellButton`…) goes in the default slot, rendered after the tour button's separator. Check here before hand-rolling another list page's navbar.
- **`PageInDevelopment`** — placeholder body for a route that exists in the nav but has no real implementation yet.
- **`ListSkeleton`** — grid/table content placeholder for a list page's own loading state (`variant: 'grid' | 'table'`, `count`/`columns` props) — not the refresh button's own spinner (`QueryRefreshControl`, kept separate on purpose). Rolled out to `/tournaments` first; check here before hand-rolling another loading-icon block for a list page's content area.
- **`AssociateTag`** (renamed from `PlayerTag` 2026-08-18 — not player-specific, already used for external payers/staff) — a person's display name as a small tag/pill (used in table cells via `h()`, imported directly rather than relying on auto-import — see the render-functions pitfall in the root `CLAUDE.md`).
- **`StandingsLegend`** — the "counted / dropped / absent[/ participation]" legend row shared by cittadino and format standings pages (`items: { sample, labelKey, dimmed? }[]`).
- **`StartDatePickerField`** — the `UPopover` + `UCalendar` "start date" field shared by events/leagues `AddModal.vue` and tournaments' `SchedulingFields.vue` (`label`/`formatted-start-date` props, `v-model:start-date`). Pair with `useStartDateField.ts`/`useTournamentFormFields.ts` for the underlying ref/computed.
- **`StatusFilterGroup`** — a row of status-filter toggle buttons (`v-model` + `items`), used by every list page's status filter (associates, tournaments, events, leagues, ...).
- **`TableSelectionFooter`** — the sticky bulk-selection action bar shown under a `UTable` once rows are selected.
- **`ViewModeTabs`** — the grid/table view-mode toggle (`v-model` + `items`), shared by every list page that offers both a grid and a table view.

## Related but deliberately separate

- **`../badges/`** (`FormatBadge`, `LocationBadge`) — small shared display badges, split into their own folder once that pattern emerged (2026-08-16) rather than living flat in `ui/` — see that folder if you need a compact icon+label badge, not this one.
- **`../layout/`** (`TeamsMenu`, `UserMenu`, `ColorModeSwitch`, `VersionBadge`) — sidebar/app-shell chrome specifically, not generic-purpose — stays out of `ui/` even though it's also `pathPrefix: false`-eligible in spirit (it isn't configured that way; these keep the default domain-folder prefix, `LayoutTeamsMenu` etc.).
