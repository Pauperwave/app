# Pauperwave - Project Architecture Analysis

**Generated:** April 2026
**Rewritten:** 2026-08-30
**Project:** Pauperwave - Pauper League Manager Dashboard
**Type:** Nuxt 4 Full-Stack Web Application

> **⚠️ Point-in-time snapshot, not a living doc.** This is a full rewrite of the original April 2026 audit — the codebase had drifted far enough (Pinia Colada adoption, the 4-tier role system, most mock endpoints migrated to real Supabase writes) that patching individual claims stopped being worthwhile. For anything ongoing, `docs/PROGRESS.md` (ADRs) and `docs/architecture/*.md` are the current source of truth; this document will drift again as the app keeps changing.

---

## 1. Executive Summary

Pauperwave is a **Magic: The Gathering Pauper League Management Dashboard** built as a modern full-stack web application. It serves as a comprehensive platform for managing card game tournaments, leagues, member associations, and event transactions — and, alongside the internal dashboard, a small set of public (unauthenticated) pages for standings and the tournament calendar.

### Core Value Proposition
- **Tournament Management**: Create, schedule, and track MTG tournaments with round management, pairings, and results, across multiple formats (not just Commander)
- **League & Event Operations**: Tournaments optionally nest under a league or an event, tracked with progress/date-range summaries
- **Member Association**: Complete associate lifecycle management (application, approval, renewal, membership status derived from a renewal ledger)
- **Financial Tracking**: Transaction management for membership fees, event/tournament payments, and donations
- **Role-based access**: A 4-tier role system (`player`/`organizer`/`admin`/`super_admin`) gates both routes and in-page actions, enforced server-side (RLS + BFF), not just in the UI
- **Analytics**: Statistics, deck performance tracking, and public standings pages

---

## 2. Technology Stack

### Frontend Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| **Nuxt** | ^4.5.2 | Full-stack Vue framework with SSR/SSG |
| **Vue** | ^3.x | Reactive UI component library |
| **TypeScript** | ^6.0.3 | Type-safe development |

### UI & Styling
| Technology | Version | Purpose |
|------------|---------|---------|
| **Nuxt UI** | ^4.10.0 | Complete UI component library (Tailwind-based) |
| **Tailwind CSS** | ^4.3.3 (via @import) | Utility-first CSS framework |
| **Lucide Icons** (`@iconify-json/lucide`) | ^1.2.123 | Primary icon set |
| **Simple Icons** / **Circle Flags** | — | Brand/service icons and country flags |

### Backend & Database
| Technology | Purpose |
|------------|---------|
| **Supabase** | PostgreSQL database + Auth (`@nuxtjs/supabase` 2.0.10) |
| **Nitro** | Nuxt's server engine (API routes, `server/api/*`) |

### State & Data Fetching
| Library | Purpose |
|---------|---------|
| **Pinia** / **@pinia/colada** | Reactive state / server-cache layer — the primary data-fetching pattern app-wide (see §4.1) |
| **@pinia/colada-plugin-cache-persister** | Persists Colada query cache to `localStorage`, with a `PERSISTENCE_EXCLUDED_KEYS` allowlist-exclusion for PII |

### Key Modules & Libraries
| Library | Purpose |
|---------|---------|
| **@nuxtjs/i18n** | Single-locale (Italian) centralized string management via `i18n/locales/it.json` — not multi-language support |
| **@vueuse/nuxt** | Vue composition utilities |
| **@nuxt/image** | Image optimization (`ipx` provider, custom `User-Agent` for the Scryfall CDN) |
| **@nuxtjs/device** | Server+client device sniffing (`useDevice()`) |
| **@nuxtjs/leaflet** | Map rendering (associates residence geocoding view) |
| **@internationalized/date** | Date-picker primitives (Nuxt UI's `UCalendar`) |
| **date-fns** | Date manipulation |
| **@tanstack/vue-table** | Headless table logic behind every `UTable` |
| **@vue-flow/*** | Node-graph rendering (bracket/pairing visualizations) |
| **nuxt-echarts** / **echarts** / **@unovis/vue** | Data visualization charts |
| **@dicebear/*** | Generated avatar fallbacks |
| **motion-v** | Animation primitives |
| **libphonenumber-js** | Phone number validation/formatting |
| **valibot** | Schema validation |
| **markdown-it** | Markdown rendering |

### Development Tools
| Tool | Purpose |
|------|---------|
| **pnpm** | Package manager (v10.17.1) |
| **ESLint** (`@nuxt/eslint`) | Code linting (zero-warning policy) |
| **vue-tsc** | Type checking (`pnpm typecheck`) |
| **vitest** / **@playwright/test** | Unit and e2e test runners — configured, 3 unit test files exist today (`test/unit/composables/tournaments/*.test.ts`), no e2e tests written yet |
| **fallow** | Static-analysis CLI (dead code, duplication, health/complexity, security) — several `pnpm fallow:*` scripts |
| **changelogen** | Release/versioning (`pnpm release`) |
| **Renovate** | Automated dependency updates |

---

## 3. Project Structure

```
app/                                # Repo root (Nuxt srcDir is also `app/`)
├── app/                            # Main application code
│   ├── app.vue                     # Root component
│   ├── app.config.ts               # UI theme configuration (primary: indigo)
│   ├── assets/css/                 # Global CSS (Tailwind entry)
│   ├── layouts/                    # default.vue (dashboard shell), auth.vue,
│   │                                # public.vue / public-wide.vue (unauthenticated pages)
│   ├── pages/                      # File-based routing (route groups in parens)
│   │   ├── index.vue                       # Dashboard home
│   │   ├── login.vue, auth/callback.vue     # Magic-link auth flow
│   │   ├── 403.vue                          # Permission-denied page
│   │   ├── calendar/, finance/               # Ungrouped top-level pages
│   │   ├── (analytics)/statistics/           # Overview, decks, commanders
│   │   ├── (community)/associates/, associate/[slug].vue, transactions/, players/, wanted-cards/
│   │   ├── (competitions)/tournaments/, leagues/, events/, locations/, rulesets/, standings/
│   │   ├── (settings)/settings.vue + settings/{index,profile,members,permissions,domains,notifications}.vue, trash.vue
│   │   └── (public)/calendario/, rankings/{cittadino,commander,pauper,premodern}/, tesseramento/  # unauthenticated
│   ├── components/                 # Vue components (feature-based, see §4.1)
│   │   ├── associates/, tournaments/, leagues/, events/, locations/, rulesets/,
│   │   │   transactions/, players/, wanted-cards/, mtgFormats/, standings/,
│   │   │   cittadino/, statistics/, finance/, tesseramento/, calendar/, rounds/, public/
│   │   │   (each with {list,single} sub-folders where applicable)
│   │   ├── inputs/, ui/            # pathPrefix:false — auto-import without a folder prefix
│   │   ├── layout/                 # Sidebar/navbar chrome (UserMenu, TeamsMenu, ColorModeSwitch, ...)
│   │   ├── badges/, magic/, notifications/, query/, tour/
│   ├── composables/                # Shared logic, mirrors components/ domain split
│   │   ├── <domain>/use<Domain>Query.ts + use<Domain>Mutations.ts  # Pinia Colada BFF pattern
│   │   ├── useUserRole.ts          # Role resolution + "View as" preview
│   │   └── ~25 cross-cutting composables (useCopyToClipboard, useSelection, ...)
│   ├── middleware/                 # auth.global.ts, authorization.global.ts (see §4.2)
│   ├── plugins/                    # user-role.client.ts (auth-state → role-cache invalidation)
│   ├── stores/                     # Not used — no domain wraps its query in a Pinia store
│   ├── types/index.d.ts            # Shared domain types (Associate, Tournament, Transaction, ...)
│   └── utils/                      # Helper functions, incl. icons.ts (single source of truth for icon strings) and permissions.ts (ROLE_LEVEL/PERMISSION_LEVEL/can())
├── server/                          # Server-side code
│   ├── api/                        # ~14 domains on the BFF pattern (see docs/architecture/api.md)
│   │   ├── associates/, events/, leagues/, locations/, mtg-formats/, players/,
│   │   │   tournament-registrations/, tournaments/, transactions/, trash/, wanted-cards/,
│   │   │   cardtrader/ (read-only proxy), settings/
│   │   ├── check-associate.post.ts # Real, pre-login exception (no session yet)
│   │   └── cittadino.ts, standings/[format].get.ts, notifications.ts  # Still mock — no backing table
│   └── utils/                      # serverAuth.ts, idRequest.ts, auditColumns.ts (shared BFF prologues)
├── shared/utils/types/database.ts  # Generated Supabase types (never hand-edited, `pnpm supabase:types`)
├── i18n/locales/it.json            # Centralized Italian strings (single-locale @nuxtjs/i18n)
├── supabase/migrations/            # 71 tracked migrations (docs/architecture/database.md)
├── test/                           # vitest (3 unit tests) + Playwright config (no e2e tests yet)
├── docs/                           # Documentation (this file)
├── scripts/                        # One-off Node scripts (geocoding, price refresh, fallow reports)
├── public/                         # Static assets
└── .env                            # Environment variables
```

---

## 4. Architecture Patterns

### 4.1 Frontend Architecture

#### Component Organization (Feature-Based)
```
components/
├── [domain]/            # associates, tournaments, leagues, events, locations, rulesets,
│                         # transactions, players, wanted-cards, mtgFormats, standings, ...
│   ├── list/             # List views + CRUD modals
│   └── single/            # Detail views
├── inputs/, ui/           # pathPrefix:false — <TaxCodeInput>, <ConfirmModal>, not <Inputs.../<Ui...
└── layout/, badges/, magic/, notifications/, query/, tour/, public/   # Cross-cutting, still domain-prefixed
```

`app/components/inputs` and `app/components/ui` are registered in `nuxt.config.ts` with `pathPrefix: false` (generic, already-unique-named primitives). Domain folders keep the default prefixed behavior on purpose — `AddModal.vue`/`GridView.vue` repeat by design across domains and need the prefix to stay distinguishable.

#### State Management
- **Pinia**: Used, but never via a hand-written `defineStore` — every domain is a plain composable pair (`use<Domain>Query.ts`/`use<Domain>Mutations.ts`) calling Pinia Colada's `useQuery`/`useMutation` directly. `app/stores/` exists but is empty by convention, not by omission.
- **Pinia Colada** (`@pinia/colada`): The primary server-state layer — shared cache across every mount of the same query key (unlike a hand-rolled `useAsyncData` composable, which refetches per mount). ~24 query keys registered today (`docs/architecture/query-keys.md`).
- **URL State**: Route query parameters for filters/views.
- **`useAsyncData`**: Only 2 domains remain on this older pattern (`cittadino`, `standings`) — both still backed by mock data, pending a real table.

#### The BFF (Backend-for-Frontend) Pattern
Reads go client-side (Colada `useQuery`, anon Supabase key, RLS applies); writes go through a `server/api/<domain>/*.post.ts` endpoint using the service-role key, which bypasses RLS — **the endpoint itself is the authorization boundary**, not a DB policy. See `docs/architecture/api.md` for the full domain inventory and `server/utils/serverAuth.ts`'s four permission-check helpers (`requireUser`/`requireManagementPermission`/`requireAdminPermission`/`requireSuperAdminPermission`).

#### Key Cross-Cutting Composables
| Composable | Responsibility |
|------------|--------------|
| `useUserRole()` | Resolves the current role (Colada query on `get_user_role` RPC), `can(permission)`, `isStaff`/`isAdmin`/etc., and the `super_admin`-only "View as" preview |
| `useSelection()` | Shared multi-row selection state for tables/grids |
| `useCopyToClipboard()` | Clipboard-write-with-toast helper |
| `useRowContextMenu()` | Right-click context-menu wiring, shared across `use<Domain>RowActions.ts` files |
| `useBreadcrumbs()` | Dynamic breadcrumb generation from routes |

### 4.2 Backend Architecture

#### API Design (Nitro/Nuxt Server)
```
server/api/
├── <domain>/create.post.ts               # Create
├── <domain>/[id]/update.post.ts          # Update (often via shared parseIdMutationRequest)
├── <domain>/[id]/delete.post.ts          # Soft delete
└── <domain>/[id]/status.post.ts          # Status transition, where applicable
```

See `docs/architecture/api.md` for the complete, current endpoint inventory across all ~14 real domains plus the 3 still-mock routes (`cittadino`, `standings/[format]`, `notifications`).

#### Authentication Flow
1. **Magic Link Auth**: `login.vue` first calls `POST /api/check-associate` (real Supabase query, service-role client via `NUXT_SUPABASE_SECRET_KEY`, runs pre-login so no session exists yet) to confirm the email belongs to a known associate, then calls `supabase.auth.signInWithOtp(...)`.
2. **`app/middleware/auth.global.ts`**: redirects unauthenticated users to `/login`; maintains a hardcoded public-page allowlist that must stay in sync with `nuxt.config.ts`'s `@nuxtjs/supabase` `redirectOptions.exclude`.
3. **`auth/callback.vue`**: completes the Supabase session exchange.
4. **`app/middleware/authorization.global.ts`**: runs after `auth.global.ts` (alphabetical ordering), reads `to.meta.permission` from `definePageMeta({ permission })`, resolves the role via `useUserRole().refresh()`, and redirects to `/403` if denied — fails closed on an unresolved/errored role rather than letting the request through.

#### Role-Based Access (fully implemented, not conceptual)
Four-tier hierarchy — `super_admin` ⊇ `admin` ⊇ `organizer` ⊇ `player`, each level a strict superset. Enforced at three layers: `definePageMeta({ permission })` + `authorization.global.ts` (route gating), `v-if="can(...)"` (in-page UI), and — the actual security boundary — Postgres RLS + the BFF's `requireXPermission` server checks. See `docs/architecture/roles.md` (implementation) and `docs/architecture/permissions.md` (the per-feature role matrix) for the full picture, including the `super_admin`-only carve-out in `assign_role` that stops an `admin` from ever touching the `super_admin` tier.

### 4.3 Database Schema

31 tables in the `public` schema, 71 tracked migrations. Full reference: `docs/architecture/database.md` (migration-by-migration changelog, RLS policy table, Commander-vs-format-agnostic table inventory, the membership-status computation model).

**Core domain tables:**
| Table | Purpose |
|-------|---------|
| `pauperwave_associates` (+ `pauperwave_associates_with_status` view) | Member profiles, consent, computed membership status |
| `pauperwave_associate_renewals` | Append-only renewal ledger — source of truth for tesseramento status |
| `players` | Gameplay identity, distinct from `pauperwave_associates` (membership) and `user_roles` (authorization) — see the three-axis model in `docs/architecture/database.md` |
| `tournaments`, `leagues`, `events`, `locations`, `organizations` | Competition scheduling |
| `pauperwave_payments` | Financial records (`payment_type`: `'Event'` vs `'Association Fee'` are treated as distinct authorization tiers) |
| `pauperwave_wanted_cards` | "Carte Cercate" feature, deliberately format-agnostic |
| `user_roles` | `app_role` (`player`/`organizer`/`admin`/`super_admin`), `UNIQUE(user_id)` |

**Associate model (from `app/types/index.d.ts`, generated `AssociateRow` + computed fields):**
```typescript
interface Associate {
  // Identity
  id, uuid, pauperwave_associate_number

  // Personal Info
  first_name, last_name, email_address, tax_code

  // Address
  residency_address, residency_city, residency_province, residency_cap

  // Membership
  membership_request_status: 'approved' | 'pending' | 'rejected'
  associate_type: 'regular' | 'sustaining' | null
  membership_status: 'approved' | 'pending' | 'rejected' | 'active' | 'to_renew' | 'expired' | 'unpaid'
  latest_renewal_year, latest_renewal_date, age  // computed at query time, never stored

  // Compliance
  consent_data, consent_social
  has_read_statute, has_acknowledged_surveillance_notice
}
```

Other shared types in `app/types/index.d.ts`: `Tournament` (`status: 'draft' | 'registration_open' | 'in_progress' | 'completed' | 'cancelled'`), `League`/`Event` (their own analogous status unions), `Transaction` (`payment_type`/`payment_method` unions, resolved `associate`/`tournament`/`event` joins).

---

## 5. Feature Analysis

### 5.1 Dashboard (`pages/index.vue`)
KPI cards, revenue/participation chart, recent transactions, date-range/period filtering, and a quick-action trigger for creating a transaction/associate/tournament/event/league.

### 5.2 Tournament Management
**Pages:** `/tournaments` (standalone list, filterable), `/tournaments/[tournamentId]` (detail). A tournament's parent league/event is optional and polymorphic — its canonical URL stays flat (not nested under `/leagues/.../tournaments/...`), with a `?from=league:<uuid>` query param carrying the back-link context the route params alone can't express.

**Key components:** participant management, round manager/results entry, leaderboard, awards, registration acceptance picker — plus `rounds/single/*` for round-level pairing/results components shared across the flow.

### 5.3 League Management
`/leagues`, `/leagues/[leagueId]` — a league aggregates its own tournaments (count, completed count, distinct formats, date range all derived, not stored columns) and can have an assigned ruleset (Commander points-based scoring).

### 5.4 Event Management
`/events`, `/events/[eventId]` — standalone events that, like leagues, can contain their own nested tournaments (matched by uuid, not name, to avoid misgrouping on a name collision).

### 5.5 Associate Management
**Workflow:** application → `pending`/`approved`/`rejected` (`membership_request_status`) → renewal, tracked as an append-only ledger (`pauperwave_associate_renewals`) rather than a single mutable status field. `membership_status` is derived at query time by comparing the latest renewal year to the current calendar year, distinguishing `active`/`to_renew`/`expired`/`unpaid` (the last two split apart — a lapsed member vs. one who was approved but never paid at all).

**Pages:** `/associates` (roster, `organizer`+), `/associates/requests` (pending renewal triage), `/associate/[slug]` (detail), `/tesseramento` (public self-service application flow, unauthenticated).

### 5.6 Carte Cercate (Wanted Cards)
`/wanted-cards` — the original template domain for the BFF pattern. Players create/manage their own requests (owner-checked, not role-gated for the "mark as found/abandoned" action); staff manage everyone's. Supports a grid, a dense grid, and a table view.

### 5.7 Transaction System
`/transactions`, `/finance` — two payment categories treated as distinct authorization tiers, not just display labels: `'Event'` (tournament/event fees, `organizer`+) and `'Association Fee'` (membership dues, `admin`+ — because recording one renews the payer's membership status).

---

## 6. UI/UX Design System

### 6.1 Theme Configuration (`app/app.config.ts`)
```typescript
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
    }
    // + several component-level :ui slot overrides (dashboardPanel, table,
    //   button, pageCard, navigationMenu) — see the file's own comments for
    //   the specific layout bugs each one fixes.
  }
})
```

### 6.2 Layout Patterns

**Dashboard Layout (`layouts/default.vue`):** collapsible/resizable sidebar + navbar + toolbar shell, same structure as the original template but with app-specific sections. A second, distinct `public.vue`/`public-wide.vue` layout serves the unauthenticated pages (`/calendario`, `/rankings/*`, `/tesseramento`).

**Key UI Features:**
- Collapsible, resizable sidebar with a "View as" role-preview banner when a `super_admin` is impersonating a lower role
- Command palette search
- Keyboard shortcuts (`g-x` navigation chords, see `docs/architecture/shortcuts.md`)
- Guided tours (`app/components/tour/`) on several list pages
- Toast notifications, slide-over panels, context menus with matching visible row-action equivalents

### 6.3 Navigation Structure (current, `useMainNavGroups.ts`)

| Section | Items | Gating |
|---|---|---|
| Dashboards | Pannello di controllo, Calendario, Statistiche (overview), Finanze | `view-finance` on Finanze |
| Community | Transazioni, Richieste (rinnovo), Associati, Giocatori, Carte Cercate | `view-finance`/`view-associates`/`view-players` |
| Competizioni | Tornei, Leghe, Eventi, Luoghi, Regolamenti | `manage-locations`/`manage-rulesets` |
| Classifiche (dropdown) | Cittadino, Commander, Premodern, Pauper | — (public read) |
| Commander | Mazzi (statistics/decks), Comandanti | — |
| Impostazioni | Generale, Profilo, Membri, Permessi, Domini, Cestino | `access-settings`/`view-trash` |

A section whose every item gets filtered out for the current role is dropped entirely, not left as a dangling header.

---

## 7. Security & Compliance

### 7.1 Authentication
- **Method**: Supabase Magic Link (OTP)
- **Flow**: Email exists check (`/api/check-associate`) → OTP sent (`signInWithOtp`) → callback exchange at `/auth/callback` → session
- **Session**: Cookie-based, `sameSite: 'lax'`

### 7.2 Authorization — fully implemented
- 4-tier role hierarchy (`player`/`organizer`/`admin`/`super_admin`), one effective role per user, enforced at the database level (`user_roles` `UNIQUE(user_id)`)
- `definePageMeta({ permission })` + `authorization.global.ts` for route gating; `v-if="can(...)"` for in-page UI; RLS + `server/utils/serverAuth.ts`'s `requireXPermission` helpers for the actual security boundary
- `assign_role` RPC self-guards two exceptions no client-side check can express safely: an `admin` can never grant or touch the `super_admin` tier, and a `role_locked` flag protects the app owner's account unconditionally
- See `docs/architecture/roles.md`/`permissions.md` for the full matrix and enforcement details, including a 2026-08-30 audit that found and closed two enforcement gaps (`'Association Fee'` payments and associate-record edits were both organizer-enforceable via direct API calls despite being documented as admin-only)

### 7.3 Data Compliance
**GDPR fields in the Associate model:** `consent_data`, `consent_social`, `has_read_statute`, `has_acknowledged_surveillance_notice`.

### 7.4 Environment Security
```
NUXT_PUBLIC_SUPABASE_URL   # Public
NUXT_PUBLIC_SUPABASE_KEY   # Public (anon key)
NUXT_SUPABASE_SECRET_KEY   # Server-only — service-role key, used by every BFF write endpoint
CARDTRADER_API_TOKEN       # Server-only — long-lived JWT, treated as a secret
```

---

## 8. Development Workflow

### 8.1 Available Scripts
```bash
pnpm dev              # Development server (http://localhost:3000)
pnpm build            # Production build
pnpm preview           # Preview production build
pnpm lint              # ESLint check
pnpm typecheck         # nuxt typecheck (vue-tsc)
pnpm check:paths       # Verify path-header comments on every source file
pnpm test              # vitest run
pnpm test:e2e          # playwright test
pnpm supabase:types    # Regenerate shared/utils/types/database.ts
pnpm fallow:*          # Static analysis (health, dupes, dead-code, security)
pnpm release           # changelogen --release
```

Test runners are configured (vitest + Playwright), with 3 unit test files written so far and no e2e suite yet — see `test/README.md`/`test/e2e/README.md`.

### 8.2 Code Quality
- **ESLint**: `@nuxt/eslint` flat config, zero-warning policy (lint/typecheck must both be clean after every change)
- **Path-header convention**: every source file under `app/`, `server/`, `shared/`, `test/`, `scripts/` starts with a comment stating its own path, checked by `scripts/check-file-paths.mjs`
- **Icon centralization**: every icon string literal (including single-use ones) goes through `app/utils/icons.ts`'s `ICONS` constant, not inlined
- **`fallow`**: static-analysis CLI tracking duplication/complexity/dead-code/security findings, with `.fallowrc.json` overrides for reviewed-and-accepted findings

### 8.3 Dependency Management
- **Renovate**: automated dependency updates
- **pnpm**: workspace-aware, pinned `unimport@4.1.1` resolution

---

## 9. Performance Considerations

### 9.1 Notable Optimizations
| Technique | Location | Benefit |
|-----------|----------|---------|
| Pinia Colada shared cache | Every `use<Domain>Query.ts` | One fetch shared across every mount of the same key, not per-component |
| `fetchAllRows` pagination helper | `app/utils/query/fetchAllRows.ts` | Works around PostgREST's silent `db.max_rows` (1000) truncation on unranged `.select()` calls — applied to `transactions`/`associates`/`associate-renewals`, still owed to a few more domains |
| `@nuxt/image`/`ipx` | Card/tournament/event images | Resizes/converts Scryfall's fixed 488×680 source to the actual display size, with a custom `User-Agent` (Scryfall's CDN rejects the default one) |
| Vite `optimizeDeps.include` | `nuxt.config.ts` | Pre-bundles CJS/heavy deps (`fast-levenshtein`, `@vue-flow/*`, `valibot`, `zod`) for faster dev-server startup |
| `@nuxt/icon` client-bundle scan | `nuxt.config.ts` | Statically inlines every icon actually referenced (via `ICONS`), instead of a runtime fetch per icon |

### 9.2 Known Gaps
- Several `use<Domain>Query.ts` composables still use a bare `.select()` rather than `fetchAllRows` — silent truncation risk once a table crosses `db.max_rows`, not yet audited domain-by-domain (`docs/BACKLOG.md`)
- A handful of Colada query keys carrying personal data (`associate-renewals`, `player-login-history`, others — see `docs/architecture/query-keys.md`) aren't yet excluded from `localStorage` persistence

---

## 10. Internationalization

**Current State:** Single-locale, Italian-only by design (`@nuxtjs/i18n`, `strategy: 'no_prefix'`, no `/it/` URL prefix) — adopted for centralized string management, not multi-language support. UI copy and route labels are in Italian; the codebase itself (identifiers, comments) is in English.

- Strings centralized in `i18n/locales/it.json`
- Date formats: European (dd/mm/yyyy)
- Currency: Euro (€)

---

## 11. Integration Points

### 11.1 External Services
| Service | Purpose |
|---------|---------|
| **Supabase** | Database + Auth |
| **GitHub** | Repository hosting, Issues + Projects for backlog tracking |
| **Scryfall** | Card data/images for Carte Cercate and card-art pickers |
| **CardTrader** | Price lookups (cached locally, `pauperwave_cardtrader_blueprints`/`expansions`) |
| **Nominatim/Photon** | Associate residence geocoding (map view) |

### 11.2 Magic: The Gathering Integrations
- **Companion App**: `companion_code` field on tournaments/events, still live
- **MTGO/MTGA nickname tracking**: removed (`mtgo_nickname`/`mtga_nickname` dropped, migration `20260819110000` — confirmed unused across the entire membership base before dropping)

---

## 12. Future Recommendations

### 12.1 Technical Debt
1. **Remaining mock endpoints**: `cittadino`, `standings/[format]`, `notifications` still return static data — no `tournament_standings`-equivalent table exists yet
2. **`fetchAllRows` coverage**: extend the pagination fix to every remaining `use<Domain>Query.ts` still on a bare `.select()`
3. **Persistence exclusions**: close the gap between which Colada keys carry PII and which are actually excluded from `localStorage` persistence
4. **Testing**: unit-test coverage is still thin (3 files); no e2e suite written yet despite Playwright being configured

### 12.2 Feature Enhancements (from `docs/architecture/roles.md`'s wider-roadmap note, not yet scoped)
1. Tournament pre-registration UI expansion
2. Commander deck submission by players
3. Payment/membership-renewal history for players
4. Event participation stats

### 12.3 Performance
1. Server-side pagination for large tables (beyond the `fetchAllRows` client-side fix)
2. Virtual scrolling for large participant lists

---

## 13. Key Files Reference

### Configuration
| File | Purpose |
|------|---------|
| `nuxt.config.ts` | Framework/module configuration |
| `app/app.config.ts` | UI theme settings |
| `eslint.config.mjs` | Linting rules |
| `colada.options.ts` | Pinia Colada cache persistence config |

### Entry Points
| File | Purpose |
|------|---------|
| `app/app.vue` | Root Vue component |
| `app/layouts/default.vue` | Dashboard shell |
| `app/pages/index.vue` | Home dashboard |
| `app/middleware/auth.global.ts` / `authorization.global.ts` | Auth + role-based route protection |

### Critical Reference Docs
| File | Purpose |
|------|---------|
| `CLAUDE.md` (root) | Stack, routing, component org, auth flow, data-fetching conventions — the primary agent-facing reference |
| `docs/architecture/roles.md` | Role system implementation |
| `docs/architecture/permissions.md` | Per-feature role matrix |
| `docs/architecture/api.md` | `server/api/*` domain inventory |
| `docs/architecture/database.md` | Schema, migrations, RLS |
| `docs/architecture/query-keys.md` | Colada query key inventory |
| `app/composables/wantedCards/useWantedCards{Query,Mutations}.ts` | The template pair for a new BFF-pattern domain |

---

## 14. Conclusion

Pauperwave is a **mature, actively-developed Nuxt application** with a real, enforced authorization model and a consistent data-fetching pattern applied across most of its domains — a substantially different codebase from the initial April 2026 audit.

**Strengths:**
- Modern stack (Nuxt 4, Vue 3, TypeScript), consistently applied Pinia Colada + BFF pattern
- Real 4-tier role system enforced at route, UI, and — the actual boundary — RLS/server level
- Comprehensive feature set for MTG league management across multiple formats
- Active documentation discipline (`docs/architecture/*.md`, ADRs in `docs/PROGRESS.md`)

**Areas for Growth:**
- Test coverage (3 unit tests, no e2e yet)
- The last few mock endpoints (cittadino/standings/notifications) awaiting real backing tables
- A handful of known, tracked gaps (pagination coverage, persistence exclusions) rather than unknown ones
