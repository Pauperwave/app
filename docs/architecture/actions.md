# Row/bulk actions inventory

<!-- docs/architecture/actions.md -->

Per-domain inventory of row-level context-menu actions, always-visible inline row actions, and bulk-selection actions — what exists, where it lives, and what's still missing. Written 2026-08-16 after an audit found several inconsistent/dead pieces (tournaments' context menu had no edit/delete despite full CRUD existing, the associates roster's selection UI rendered with nothing wired to it, transactions had no bulk support at all, and associates' bulk buttons were bespoke instead of the shared bar pattern) — all four are fixed as of this doc's writing. Keep this updated when a domain's actions change; it's the single place to spot the next asymmetry.

## Legend

- ✅ exists
- — not applicable / not built (domain is read-only or pre-CRUD)
- ⚠️ deliberate gap, see the domain's note

## Matrix

| Domain | Context menu | Inline row actions | Bulk actions | Composables |
|---|---|---|---|---|
| **wanted-cards** | status-change, copy name, view Scryfall/CardMarket/CardTrader, edit, delete | — | status-change, delete, refresh-prices, copy-names (all with 10s undo) | `useWantedCardsRowActions.ts`, `useWantedCardsBulkActions.ts` |
| **associates — roster** (`/associates`) | — | edit (row click → modal) | renew (creates one Association Fee transaction per selected associate) | `useAssociatesRowActions.ts`, `useAssociatesBulkActions.ts` |
| **associates — requests** (`/associates/requests`) | approve (pending rows)/restore (rejected rows)/renew (approved, not yet active)/edit | — | approve, reject (10s undo), restore | `useAssociatesRowActions.ts`, same bulk composables as roster — both pages share `AssociatesListBulkActionsBar.vue` |
| **transactions** | edit, delete | — | delete (**no undo** — see note) | `useTransactionsRowActions.ts`, `useTransactionsBulkActions.ts` |
| **tournaments** | copy link, copy id, edit, delete | edit (button, table+grid) | status-change, delete (10s undo) | `useCopyLinkContextMenu.ts` + page-local `tournamentContextMenuItems()`, `useTournamentsRowActions.ts`, `useTournamentsBulkActions.ts` |
| **events** | copy link, copy id | — | — | `useCopyLinkContextMenu.ts` |
| **leagues** | copy link, copy id, edit, delete | edit (button, table+grid) | status-change, delete (10s undo) | `useCopyLinkContextMenu.ts` + page-local `leagueContextMenuItems()`, `useLeaguesRowActions.ts`, `useLeaguesBulkActions.ts` |
| **locations** | — | edit (button, table+grid) | — | `useLocationsRowActions.ts` |
| **rulesets** | — | — | — | read-only, no mutations built |
| **players** | — | — | — | read-only, no mutations built |

## Notes

**Transactions' bulk delete has no undo window, on purpose.** `useTransactionsRowActions.ts`'s single-row `confirmDelete` already skips it — "a payment is a financial record, not something to silently commit a few seconds after the confirm click." The bulk version (`useTransactionsBulkActions.ts`) follows the same reasoning: the mutation runs synchronously behind the confirm button's loading state, not `useUndoableAction.ts`.

**No delete anywhere for associates, row or bulk — deliberate, not a gap.** An associate is never actually removed; membership status is computed from the latest renewal year vs. the current one (`docs/architecture/database.md`, "Membership status model"). A lapsed member stays visible with their last renewal date, they don't disappear. "Rejected" (a request-queue state) is the closest equivalent to a soft-delete and already has its own restore path.

**Associates' bulk "Rinnova" needs a `received_by` value that can't be auto-derived.** `RECEIVER_OPTIONS` (`useTransactionFormOptions.ts`) is a hardcoded board-member name list — there's no "current logged-in user" concept in this app to default to. The bulk-renew confirm modal (`useAssociatesBulkActions.ts`) has its own required selector for it rather than guessing or silently omitting it.

**Events is still pre-CRUD by design, not an oversight.** It only has a create flow (`AddModal.vue`, no `EditModal.vue`) — `useCopyLinkContextMenu.ts` is the generic "copy link / copy id" menu shared by all three (events/leagues/tournaments) for domains without real edit/delete infrastructure. Tournaments and leagues (2026-08-16) have both outgrown it; events hasn't yet — see `docs/BACKLOG.md` for when real CRUD lands there.

**Tournaments' and leagues' context menus compose the shared generic items with their own.** Rather than growing `useCopyLinkContextMenu.ts` a domain-specific branch, `tournaments/index.vue`/`leagues/index.vue` each define their own `tournamentContextMenuItems()`/`leagueContextMenuItems()` that spread `rowContextMenuItems(item)` (copy link/id) and append edit/delete, reusing `use<Domain>BulkActions.ts`'s `requestDelete` fed a single-item array rather than a separate single-delete code path. Leagues' version (`useLeaguesRowActions.ts`, `useLeaguesBulkActions.ts`, `LeaguesListEditModal.vue`, `LeaguesListBulkActionsBar.vue`) mirrors the tournaments one file-for-file.

**Locations has no delete, row or bulk.** Only inline edit exists today (`useLocationsRowActions.ts`). Not evaluated as part of this pass — worth a look if locations gets more actively managed.

## Shared building blocks

- **`useCopyLinkContextMenu.ts`** — generic "copy link"/"copy id" context-menu items for domains without dedicated edit/delete infra yet (events, leagues; tournaments extends it — see note above).
- **`ConfirmModal.vue`** (`components/ui/`) — the confirm step behind every destructive/bulk action. Supports a `#body` slot for item-specific context (a list of names, a thumbnail) and a `confirmDisabled` prop for confirms that need extra required input first (e.g. associates' bulk-renew "received by" selector).
- **`useUndoableAction.ts`** — the 10-second undo-toast pattern used by wanted-cards/tournaments/associates-reject. Transactions deliberately opts out (see note above).
- **`<Domain>ListBulkActionsBar.vue`** — one per domain (`tournaments/`, `wanted-cards/`, `transactions/`, and `associates/` which is shared across both associates pages), same "dumb component, page owns the state" shape: `side: 'left' | 'right'` swaps between a filters row and the bulk-action row in the same `UDashboardToolbar` slot, no extra row/layout shift.

## Updating this doc

Whenever a domain gains/loses a context-menu item, an inline row action, or a bulk action, update its matrix row and add a note if the reasoning isn't obvious from the table alone (an intentional gap, an undo-window exception, a value that can't be auto-derived, etc.) — the "why," not just the "what," is what makes this useful the next time someone's deciding whether an asymmetry is a bug or a decision.
