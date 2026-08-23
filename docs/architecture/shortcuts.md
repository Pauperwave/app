# Keyboard shortcuts

<!-- docs/architecture/shortcuts.md -->

All shortcuts are registered via Nuxt UI's `defineShortcuts`. Two separate call sites, by design (see "Why two call sites" below):

- `app/composables/useDashboard.ts` — navigation (`g-x` chords) and the one global toggle that doesn't need the sidebar's own state (`n`).
- `app/layouts/default.vue` — `b`, the one shortcut that needs the sidebar's `collapsed` state directly (see "Sidebar collapse" below).

## Navigation (`g-x` chords)

Two-key chords, not bare letters — same convention as GitHub's own shortcuts. With 20+ nav destinations in the sidebar, bare single letters run out fast and collide both with each other and with the non-navigation single-letter actions below. The `g` prefix also acts as a cheap safety margin against accidental triggers: a stray keypress is far less likely to land on "g" then a specific letter within the chord window than to just hit one bare letter.

| Chord | Destination | Route |
|---|---|---|
| `g` `a` | Associati | `/associates` |
| `g` `i` | Giocatori | `/players` |
| `g` `n` | Transazioni | `/transactions` |
| `g` `w` | Carte Cercate | `/wanted-cards` |
| `g` `t` | Tornei | `/tournaments` |
| `g` `l` | Leghe | `/leagues` |
| `g` `e` | Eventi | `/events` |
| `g` `c` | Calendario | `/calendar` |
| `g` `f` | Finanze | `/finance` |
| `g` `r` | Richieste di tesseramento | `/associates/requests` |
| `g` `s` | Statistiche → Panoramica | `/statistics` |
| `g` `m` | Membri | `/settings/members` |
| `g` `p` | Permessi | `/settings/permissions` |
| `g` `d` | Domini | `/settings/domains` |
| `g` `x` | Cestino | `/trash` |

No chord for Home (`/`), Regolamenti (`/rulesets`), Mazzi (`/statistics/decks`), Classifica Cittadino (`/standings/cittadino`), or Impostazioni → Generali (`/settings`). `g-h` removed 2026-08-23 at the user's request (Home no longer gets a chord). `g-r` moved the same day from Regolamenti to Richieste di tesseramento — "requests," the second-most-recognizable letter fits like Giocatori/Transazioni's own "g"/"t"-collision picks below ("Regolamenti" itself has no obvious replacement letter free, so it goes chord-less rather than picking an arbitrary one — same treatment Mazzi/Cittadino already got). Mazzi/Cittadino: reassigned 2026-08-11 at the user's request — "m"/"c" now point at Membri/Calendario instead, and no replacement letter was picked for the pages that lost them. Impostazioni → Generali: its only intuitive letter was "g" itself — but `g-g` is never assignable to anything, on purpose (see below), and no other letter was free, so it stays chord-less too.

Calendario and Finanze were pure stubs with no route at all until 2026-08-11, when minimal placeholder pages (`app/pages/calendar/index.vue`, `app/pages/finance/index.vue` — just a navbar title and an "in development" notice, matching `common.pageInDevelopment`) were added specifically so `g-c`/`g-f` had somewhere to go.

Several of these are deliberately not the item's own first letter, because the obvious letter was already taken by a more established chord: Giocatori/Transazioni collide with Generali/Tornei ("g"/"t" already spoken for), so they use their second-most-recognizable letter instead ("gIocatori", "traNsazioni"). Cestino (`g-x`, 2026-08-23) has no letter-based mnemonic at all — "c" was already Calendario's and no other letter in the word was free either, so "x" was picked arbitrarily (a common "remove/close" association in other apps, close enough to stand in for a mnemonic).

**`g-g` is permanently reserved as unassignable.** OS key-repeat sends multiple `keydown g` events while the key is held; `defineShortcuts` reads the last two keystrokes as a chord, so holding "g" a beat too long reads as the chord "g-g" by itself — no second key press needed. Any destination mapped there would fire just from holding the prefix, which defeats the whole point of a chord as an accidental-trigger safety margin. Don't reuse it later, even if a letter shortage makes it tempting.

`g-p` used to point at `/settings/payment`, a stale route from the original Nuxt UI dashboard template scaffold this app was bootstrapped from — that page never existed here. Fixed 2026-08-11 alongside adding the other four chords; "p" already fit "Permessi" better anyway (Permessi replaced Notifiche in the settings nav on 2026-08-08).

The route → chord map lives in `app/utils/navShortcuts.ts` (`NAV_SHORTCUTS`), not hand-duplicated in `useDashboard.ts` and `default.vue` separately. `useDashboard.ts` builds its `defineShortcuts` config from it; `default.vue` reads it to render the "press g" hint below. One source of truth, so the registered chords and the hint can't drift apart.

### "Press g" hint

Pressing "g" shows a muted `g x` `UKbd` pair next to each nav item's label, and it stays until the next keystroke — no auto-hide timer (an earlier version hid it after ~800ms, matching `defineShortcuts`' own `chainDelay`, but that made it disappear before some people had time to read it). Wired via a small parallel `keydown` listener in `default.vue` — `defineShortcuts` itself exposes no "chord pending" state to hook into. This reinforces the chords for people who already know to press "g"; it isn't a first-time-discoverability affordance (that's `UDashboardSearch`'s job). Only shows in expanded sidebar mode, and respects the same "not while typing in an input" rule as `defineShortcuts`.

Note this can outlive `defineShortcuts`' own 800ms chain window: if nothing else is pressed, the hint keeps showing even after the chord opportunity has technically expired. Accepted tradeoff — the hint is a reminder of the mapping, not a strict "chord is live" indicator, and re-pressing "g" always re-opens a fresh chain regardless.

## Global actions (bare single letters)

Deliberately not part of the `g-x` navigation set — these aren't "go to a place," they're "do a thing right here," so a chord would just add friction for no safety benefit (there's nothing to accidentally navigate away from).

| Key | Action | Where it's wired |
|---|---|---|
| `n` | Toggle the notifications slideover | `useDashboard.ts` |
| `b` | Toggle sidebar collapsed/expanded | `default.vue` (see below) |
| `h` | Start/restart the current page's guided tour | `TourGuide.vue` (see below) |

`defineShortcuts` treats a bare `h` and any two-key chord starting with `g` as distinct bindings regardless — the same way bare `n` already coexists with `g-n` (Transazioni) — so bare `h` was never actually at risk of colliding with the now-removed `g-h` chord.

There used to be a `t` shortcut for the light/dark theme toggle, removed 2026-08-11. It also would have needed to bypass `LayoutColorModeSwitch.vue`'s own click handler (`useThemeTransition().toggleTheme` takes a `MouseEvent` to anchor its circular reveal animation at the click position, which a keyboard press doesn't have), so nothing else was affected by dropping it.

## Why `b` lives in `default.vue`, not `useDashboard.ts`

The sidebar's collapsed state is normally reached via Nuxt UI's own internal `useDashboard()` util (`@nuxt/ui/utils/dashboard` — an unrelated, undocumented export that happens to share a name with this project's own `useDashboard.ts` composable). That util is `provide`/`inject`-based, `provide()`d by `<UDashboardGroup>` itself — reachable only from *descendants* of `<UDashboardGroup>` in the component tree, not from `default.vue`'s own `<script setup>`, which is `UDashboardGroup`'s *parent* (the component that renders it).

An earlier version of this worked around that by injecting the state from a tiny renderless placeholder component rendered inside `<UDashboardGroup>`'s template. Removed 2026-08-11 in favor of the pattern from Nuxt UI's own "Control collapsed state" docs example: `default.vue` just owns a plain `sidebarCollapsed` ref, bound via `v-model:collapsed` on `<UDashboardSidebar>`, and the shortcut flips that ref directly — no injection needed. `<UDashboardSidebarCollapse>`'s own button stays in sync automatically, since it's a descendant reading the same provided context, which now simply mirrors this ref.

The ref is named `sidebarCollapsed`, not `collapsed`: the sidebar's `#header`/`#default`/`#footer` slots already destructure a scoped `collapsed` prop of their own, and reusing the name trips `vue/no-template-shadow`.

## Why `h` lives in `TourGuide.vue`, not `useDashboard.ts`

Same reasoning as `b`: the thing the shortcut needs — which tour is "active" — is page-local state (each page defines its own `use<Page>Tour()` and renders its own `<TourGuide :tour="...">`), not something `useDashboard.ts` has access to. Rather than building a global registry that pages register/unregister into, `TourGuide.vue` just calls `defineShortcuts({ h: () => tour.start() })` directly on the `tour` prop it already has. At most one page tour's `<TourGuide>` is ever mounted at a time, and `defineShortcuts` cleans up its own listeners when the calling component unmounts — so navigating between pages automatically swaps which tour `h` starts, with no coordination code needed anywhere.

One exception: `default.vue`'s own `<TourGuide :tour="shortcutsTour">` (the "Scorciatoie da tastiera" tour) is part of the *layout*, so it's mounted on every page alongside whatever page-specific tour that page renders — two simultaneous `defineShortcuts({ h: ... })` calls would collide. It opts out via `<TourGuide :tour="shortcutsTour" :h-shortcut="false">`; the shortcuts tour keeps its existing trigger (the sidebar item), it just doesn't also claim the bare `h` key.

## Adding a new shortcut

- **New page/section to navigate to:** add a `g-x` entry in `useDashboard.ts`, picking a letter that doesn't collide with an existing chord's second key (chords don't collide across different first keys, only within the same one — `g-p` and a hypothetical `x-p` chord would be fine together).
- **New global action that doesn't need component-local state:** add it to the same `defineShortcuts` call in `useDashboard.ts`.
- **New global action that *does* need state from somewhere `useDashboard.ts` can't reach** (e.g. another provide/inject context scoped to a specific part of the tree): follow the `b` pattern — own the state as a plain ref wherever it naturally lives, and call `defineShortcuts` from that same component, not from `useDashboard.ts`.
