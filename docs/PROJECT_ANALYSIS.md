# Pauperwave - Project Architecture Analysis

**Generated:** April 2026
**Updated:** August 2026
**Project:** Pauperwave - Pauper League Manager Dashboard
**Type:** Nuxt 4 Full-Stack Web Application

> **⚠️ Point-in-time snapshot, not a living doc.** Several claims below are superseded — check `docs/PROGRESS.md` (ADRs, the current architectural source of truth) before trusting anything here as current fact. Known-stale as of 2026-08-08:
> - §2 "`@tanstack/vue-table` is not a project dependency" — **now used** (`wanted-cards` table view, added 2026-08-07).
> - §4.1 "Pinia: Not used" — **now used** (Pinia + Pinia Colada, ADR-007, added 2026-08-08) for migrated domains; `useAssociates.ts`-style plain composables still exist for domains not yet migrated.
> - §4.2 "Current Endpoints" table — `wanted-cards` now has 4 real BFF endpoints (`server/api/wanted-cards/*.post.ts`, ADR-007/008); see `docs/architecture/api.md`.
> - §8.1 "There is no test runner configured" — `vitest`/`Playwright` **are configured** (mirroring `league`), just no test files written yet; see `docs/architecture/testing.md`.
> - §11 doesn't mention `MagicTheGathering/league`'s imminent integration (deadline 2026-08-30) — see ADR-003 in `docs/PROGRESS.md`, the single most important piece of current context missing from this document.

---

## 1. Executive Summary

Pauperwave is a **Magic: The Gathering Pauper League Management Dashboard** built as a modern full-stack web application. It serves as a comprehensive platform for managing card game tournaments, leagues, member associations, and event transactions.

### Core Value Proposition
- **Tournament Management**: Create, schedule, and track MTG tournaments with round management
- **League Operations**: Multi-season league tracking with leaderboards
- **Member Association**: Complete associate lifecycle management (registration, approval, renewal)
- **Financial Tracking**: Transaction management for fees, donations, and event payments
- **Analytics**: Statistics and deck performance tracking

---

## 2. Technology Stack

### Frontend Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| **Nuxt** | ^4.4.2 | Full-stack Vue framework with SSR/SSG |
| **Vue** | ^3.x | Reactive UI component library |
| **TypeScript** | ^5.9.3 | Type-safe development |

### UI & Styling
| Technology | Version | Purpose |
|------------|---------|---------|
| **Nuxt UI** | ^4.6.1 | Complete UI component library (Tailwind-based) |
| **Tailwind CSS** | v4 (via @import) | Utility-first CSS framework |
| **Lucide Icons** | ^1.2.101 | Modern icon library |
| **Simple Icons** | ^1.2.76 | Brand/service icons |

### Backend & Database
| Technology | Purpose |
|------------|---------|
| **Supabase** | PostgreSQL database + Auth (`@nuxtjs/supabase` ^2.0.0) |
| **Nitro** | Nuxt's server engine (API routes) |

### Key Libraries
| Library | Purpose |
|---------|---------|
| **@vueuse/nuxt** | Vue composition utilities |
| **@nuxt/image** | Optimized image handling |
| **date-fns** | Date manipulation |
| **zod** | Schema validation (v4) |
| **maska** | Input masking |
| **@unovis/vue** / **@unovis/ts** | Data visualization charts |

### Development Tools
| Tool | Purpose |
|------|---------|
| **pnpm** | Package manager (v10.17.1) |
| **ESLint** (`@nuxt/eslint`) | Code linting |
| **vue-tsc** | Type checking |
| **Renovate** | Automated dependency updates |
| **@faker-js/faker** | Mock data generation (dev dependency) |

> Note: `@tanstack/vue-table` is **not** a project dependency (an earlier version of this document listed it in error).

---

## 3. Project Structure

```
app/                              # Repo root (Nuxt srcDir is also `app/`)
├── app/                          # Main application code
│   ├── app.vue                   # Root component
│   ├── app.config.ts             # UI theme configuration
│   ├── assets/css/               # Global CSS (Tailwind entry)
│   ├── layouts/                  # Page layouts
│   │   ├── default.vue           # Dashboard layout (sidebar + navbar)
│   │   └── auth.vue              # Auth pages layout (centered)
│   ├── pages/                    # File-based routing (route groups in parens)
│   │   ├── index.vue             # Dashboard home
│   │   ├── login.vue             # Magic link authentication
│   │   ├── (analytics)/statistics/       # Overview + decks
│   │   ├── (community)/associates/       # Member management
│   │   ├── (community)/transactions/     # Financial records
│   │   ├── (competitions)/tournaments/   # Standalone tournaments
│   │   ├── (competitions)/leagues/       # Leagues (nest tournaments)
│   │   ├── (competitions)/events/        # Events (nest tournaments)
│   │   ├── (settings)/settings/          # General/Members/Notifications/Security
│   │   └── auth/callback.vue             # Supabase OTP callback
│   ├── components/               # Vue components (feature-based, see §4.1)
│   │   ├── home/                 # Dashboard widgets
│   │   ├── associates/{list,single}/
│   │   ├── tournaments/{list,single}/
│   │   ├── leagues/{list,single}/
│   │   ├── events/{list,single}/
│   │   ├── rounds/single/        # Round-level components (results, pairings)
│   │   ├── transactions/{list,single}/
│   │   ├── settings/
│   │   ├── inputs/               # Auto-imported without prefix (see nuxt.config.ts)
│   │   ├── UserMenu.vue          # User dropdown
│   │   ├── TeamsMenu.vue         # Team selector
│   │   └── NotificationsSlideover.vue
│   ├── composables/              # Shared logic
│   │   ├── useDashboard.ts       # Dashboard state & shortcuts
│   │   ├── useAssociates.ts      # Supabase data fetching
│   │   └── useBreadcrumbs.ts     # Navigation breadcrumbs
│   ├── middleware/               # Route middleware
│   │   └── auth.global.ts        # Global auth protection
│   ├── plugins/                  # Nuxt plugins
│   ├── stores/                   # Reserved for future state stores (currently empty)
│   ├── types/                    # TypeScript definitions (index.d.ts)
│   └── utils/                    # Helper functions
├── server/                       # Server-side code
│   └── api/
│       ├── tournaments.ts        # Mock tournament data (generated, not Supabase-backed)
│       ├── leagues.ts            # Mock league data (generated, not Supabase-backed)
│       ├── members.ts            # Team members data (mock)
│       ├── notifications.ts      # Notification data (mock)
│       └── check-associate.post.ts # Real Supabase query — email existence check for login
├── shared/                       # Nuxt `shared/` dir (auto-imported isomorphic code); currently empty
├── docs/                         # Documentation (this file)
├── public/                       # Static assets
└── .env                          # Environment variables
```

---

## 4. Architecture Patterns

### 4.1 Frontend Architecture

#### Component Organization (Feature-Based)
```
components/
├── [feature]/          # Domain-specific components (associates, tournaments, leagues, events, rounds, transactions)
│   ├── list/           # List views with CRUD modals
│   └── single/         # Detail views
└── [shared]/           # Cross-cutting components (UserMenu, TeamsMenu, NotificationsSlideover, ...)
```

`app/components/inputs` is registered in `nuxt.config.ts` with `pathPrefix: false`, so its components auto-import **without** an `Inputs` prefix (e.g. `<TaxCodeInput>`, not `<InputsTaxCodeInput>`). All other component directories keep the default prefixed auto-import behavior.

**Pattern Benefits:**
- Clear domain boundaries
- Co-located related functionality
- Easy feature navigation

#### State Management
- **Pinia**: Not used. An `app/stores/` directory exists but is currently empty — reserved, not yet adopted.
- **Composables**: Shared reactive state via `useAsyncData`-backed composables (see `useAssociates.ts` pattern below)
- **URL State**: Route query parameters for filters/views
- **Supabase**: Real-time database state

#### Key Composables
| Composable | Responsibility |
|------------|--------------|
| `useDashboard()` | Global UI state (notifications panel, keyboard shortcuts) |
| `useAssociates()` | Supabase data fetching with caching |
| `useBreadcrumbs()` | Dynamic breadcrumb generation from routes |

**Data-fetching composable pattern** (`useAssociates.ts`): wrap `useSupabaseClient()` calls in `useAsyncData`, always set `default: () => []` and `lazy: true`, and rethrow Supabase errors via `createError({ statusCode: 500, message })`. New domain composables should follow this shape rather than introducing a store.

### 4.2 Backend Architecture

#### API Design (Nitro/Nuxt Server)
```typescript
// RESTful endpoints with type safety
server/api/
├── [resource].ts           # GET collection
└── [resource].post.ts      # POST create
```

**Current Endpoints:**
| Endpoint | Method | Purpose | Data source |
|----------|--------|---------|--------------|
| `/api/tournaments` | GET | List all tournaments | **Mock** (generated in-memory, 30 fake rows) |
| `/api/leagues` | GET | List all leagues | **Mock** (generated in-memory, 30 fake rows) |
| `/api/members` | GET | Team member list | Mock |
| `/api/notifications` | GET | User notifications | Mock |
| `/api/check-associate` | POST | Verify email exists in `pauperwave_associates` | **Real** — queries Supabase via service-role client |

Most list/detail views for tournaments, leagues, and associates in the UI actually read from Supabase directly through composables (e.g. `useAssociates`), not through these mock `server/api` endpoints — the mock endpoints appear to be leftover scaffolding from the original dashboard template and have not all been migrated to real queries yet.

#### Authentication Flow
1. **Magic Link Auth**: `login.vue` first calls `POST /api/check-associate` (real Supabase query on `pauperwave_associates.email_address`) to confirm the email belongs to a known associate, then calls `supabase.auth.signInWithOtp(...)`.
2. **Global Middleware**: `app/middleware/auth.global.ts` redirects unauthenticated users to `/login`, and redirects already-authenticated users away from `/login` back to `/`. It maintains a hardcoded public-page allowlist: `/login`, `/auth/callback`, `/logout`.
3. **Supabase module redirect options**: `nuxt.config.ts` also configures `@nuxtjs/supabase`'s own `redirectOptions` (`login: '/login'`, `callback: '/auth/callback'`, `exclude: ['/login', '/auth/callback', '/']`). This list must be kept in sync with the middleware's `publicPages` array whenever a new unauthenticated route is added — they currently overlap but are not derived from a single source of truth.
4. **Role-Based Access**: Owner, Organizer, Judge, Writer roles (data model only — no role-gated UI/routes implemented yet).

### 4.3 Database Schema (Inferred)

**Primary Tables:**
| Table | Purpose |
|-------|---------|
| `pauperwave_associates` | Member profiles & consent |
| `tournaments` | Event scheduling & metadata |
| `leagues` | Season/series grouping |
| `transactions` | Financial records |

**Associate Model Key Fields** (from `app/types/index.d.ts`):
```typescript
interface Associate {
  // Identity
  id, uuid, pauperwave_associate_number

  // Personal Info
  first_name, last_name, email_address, tax_code

  // Address
  residency_address, residency_city, residency_province, residency_cap

  // Gaming
  mtgo_nickname, mtga_nickname

  // Membership
  request_status: 'accepted' | 'pending' | 'rejected'
  associate_type: 'ordinario' | 'sostenitore'
  association_date, payment_date

  // Compliance
  consent_data, consent_social
  has_read_statute, has_acknowledged_surveillance_notice
}
```

Other shared types in `app/types/index.d.ts`: `Tournament` (`status: 'scheduled' | 'canceled' | 'ongoing' | 'completed'`), `Transaction` (`status: 'paid' | 'failed' | 'refunded'`).

---

## 5. Feature Analysis

### 5.1 Dashboard (`pages/index.vue`)
**Purpose:** Administrative overview with quick actions

**Components:**
- `HomeStats` - KPI cards with trends
- `HomeChart` - Revenue/participation visualization (Unovis)
- `HomeSales` - Recent transaction list
- `HomeDateRangePicker` - Date filtering
- `HomePeriodSelect` - Aggregation period (daily/weekly/monthly)

**Features:**
- Quick action FAB (create transaction, associate, tournament, event, league)
- Date range filtering
- Period-based data aggregation

### 5.2 Tournament Management
**Purpose:** MTG tournament lifecycle management

**Pages:**
- `/tournaments` - Standalone tournament list view with filters
- `/tournaments/[tournamentId]` - Detail view
- Tournaments also nest under leagues (`/leagues/[leagueId]/tournaments/[tournamentId]`) and events (`/events/[eventId]/tournaments/[tournamentId]`)

**Components:**
- `tournaments/list/Overview` - Tournament list table
- `tournaments/single/Overview` - Tournament details
- `tournaments/single/Participants` - Player management
- `tournaments/single/RoundManager` - Round creation
- `tournaments/single/RoundResults` - Results entry
- `tournaments/single/Leaderboard` - Rankings
- `tournaments/single/Awards` - Prize distribution
- `tournaments/single/AcceptancePicker` - Registration approval
- `rounds/single/*` - Round-level components used within a tournament's round management

**Data Model:**
```typescript
interface Tournament {
  id, uuid
  name, description
  start_date
  round_count, round_duration
  registered_players
  format, organizer, location
  entry_fee, prizes
  companion_code
  status: 'scheduled' | 'canceled' | 'ongoing' | 'completed'
  league // Reference to parent league
}
```

### 5.3 League Management
**Purpose:** Multi-tournament series organization

**Pages:** `/leagues`, `/leagues/[leagueId]`, with nested tournaments under `/leagues/[leagueId]/tournaments/...`

**Key Features:**
- Season-based grouping (Spring, Summer, Autumn, Winter)
- Tournament aggregation
- Leaderboards across series

### 5.4 Event Management
**Purpose:** Standalone events that, like leagues, can contain their own nested tournaments

**Pages:** `/events`, `/events/[eventId]` (with `EventParticipants.vue`, `EventResults.vue` alongside `index.vue`), nested tournaments under `/events/[eventId]/tournaments/...`

### 5.5 Associate Management
**Purpose:** Member lifecycle from application to renewal

**Workflow States:**
1. `pending` - Application pending approval
2. `accepted` - Approved member
3. `rejected` - Application rejected

**Features:**
- Application form with consent tracking
- Tax code validation (Italian format)
- MTGO/MTGA nickname collection
- GDPR compliance (consent flags)

**Component:** `associates/list/AddModal.vue` (complex registration form)

### 5.6 Transaction System
**Purpose:** Financial tracking for membership and events

**Transaction Types:**
- `association-fee` - Annual membership dues
- `event-fee` - Tournament entry fees
- `donations` - Voluntary contributions

---

## 6. UI/UX Design System

### 6.1 Theme Configuration (`app/app.config.ts`)
```typescript
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'green',   // Brand color (Magic: The Gathering)
      neutral: 'zinc'     // Gray scale
    }
  }
})
```

### 6.2 Layout Patterns

**Dashboard Layout (`layouts/default.vue`):**
```
┌─────────────────────────────────────────┐
│  [Sidebar]    │  [Navbar]               │
│  - Teams      │  - Title               │
│  - Search     │  - Actions             │
│  - Nav Links  ├─────────────────────────┤
│  - Footer     │  [Toolbar]              │
│               │  - Breadcrumbs         │
│               │  - Filters               │
│               ├─────────────────────────┤
│               │                         │
│               │      [Content Area]      │
│               │                         │
│               │                         │
└───────────────┴─────────────────────────┘
```

**Key UI Features:**
- Collapsible, resizable sidebar
- Command palette search (Ctrl+K)
- Keyboard shortcuts (`g-h` home, `g-a` associates, etc.)
- Breadcrumb navigation with query param support
- Toast notifications
- Slide-over panels (notifications)

### 6.3 Navigation Structure

| Path | Label | Icon | Children |
|------|-------|------|----------|
| `/` | Pannello di controllo | house | - |
| `/transactions` | Transazioni | wallet | All, Fees, Event Fees, Donations |
| `/associates` | Associati | users | All, Waiting, Active, Expired |
| `/tournaments` | Tornei | swords | - |
| `/events` | Eventi | calendar | - |
| `/leagues` | Leghe | trophy | - |
| `/statistics` | Statistiche | chart-pie | Overview, Decks |
| `/settings` | Impostazioni | settings | General, Members, Notifications, Security |

---

## 7. Security & Compliance

### 7.1 Authentication
- **Method**: Supabase Magic Link (OTP)
- **Flow**: Email exists check (`/api/check-associate`, service-role client) → OTP sent (`signInWithOtp` from client) → callback exchange at `/auth/callback` → auto-login
- **Session**: Cookie-based, `sameSite: 'lax'`, domain left empty to default to the current domain (`nuxt.config.ts` `supabase.cookieOptions`)

### 7.2 Authorization
- Global middleware (`auth.global.ts`) protects all routes except `/login`, `/auth/callback`, `/logout`
- `@nuxtjs/supabase` module `redirectOptions.exclude` independently excludes `/login`, `/auth/callback`, `/` — keep both lists in sync (see §4.2 point 3)
- Role-based UI elements (future implementation — `Owner/Organizer/Judge/Writer` roles exist conceptually but aren't yet enforced in routes/components)

### 7.3 Data Compliance
**GDPR Fields in Associate Model:**
- `consent_data` - Data processing consent
- `consent_social` - Social media usage consent
- `has_read_statute` - Association statute acknowledgment
- `has_acknowledged_surveillance_notice` - Privacy notice

### 7.4 Environment Security
```
NUXT_PUBLIC_SUPABASE_URL  # Public
NUXT_PUBLIC_SUPABASE_KEY  # Public (anon key)
NUXT_SUPABASE_SECRET_KEY  # Server-only (secret) — used in server/api/check-associate.post.ts
```

---

## 8. Development Workflow

### 8.1 Available Scripts
```bash
pnpm dev        # Development server (http://localhost:3000)
pnpm build      # Production build
pnpm preview    # Preview production build
pnpm lint       # ESLint check
pnpm typecheck  # nuxt typecheck (vue-tsc)
```

There is no test runner configured in this repo (no Vitest/Playwright installed as of this update).

### 8.2 Code Quality
- **ESLint**: `@nuxt/eslint` flat config (`eslint.config.mjs`), extends the Nuxt-generated config with stylistic rules: 1tbs brace style, no dangling commas, `vue/max-attributes-per-line` (3 single-line / 1 multi-line), `vue/no-multiple-template-root` disabled
- **TypeScript**: project references split across `.nuxt/tsconfig.{app,server,shared,node}.json`, generated by `nuxt prepare`/`nuxt typecheck`
- **Auto-imports**: components and composables auto-imported; `components/inputs` registered without its directory prefix

### 8.3 Dependency Management
- **Renovate**: Automated dependency updates via GitHub App
- **pnpm**: Workspace-aware package manager (`pnpm-workspace.yaml`), pinned `unimport@4.1.1` resolution

---

## 9. Performance Considerations

### 9.1 Optimizations Implemented
| Technique | Location | Benefit |
|-----------|----------|---------|
| `shallowRef` | Date ranges | Prevents deep reactivity overhead |
| `lazy: true` | `useAsyncData` calls | Deferred data fetching |
| Vite `optimizeDeps.include: ['zod']` | `nuxt.config.ts` | Pre-bundles zod for faster dev-server startup |
| Client/Server components | `HomeChart` | No SSR for charts |

### 9.2 Image Handling
- `@nuxt/image` for optimized images
- Favicon configured in `app.vue`

---

## 10. Internationalization

**Current State:** Italian-focused
- Route labels in Italian ("Pannello di controllo", "Associati")
- Date formats: European (dd/mm/yyyy implied)
- Language: `lang="it"` in HTML attrs

**Currency:** Euro (€) implied by context

---

## 11. Integration Points

### 11.1 External Services
| Service | Purpose |
|---------|---------|
| **Supabase** | Database + Auth |
| **GitHub** | Repository hosting |
| **Telegram** | Support link (t.me/emanuelenardi) |

### 11.2 Magic: The Gathering Integrations
- **Companion App**: `companion_code` field for Wizards' app
- **MTGO**: Magic Online nickname tracking
- **MTGA**: Magic Arena nickname tracking

---

## 12. Future Recommendations

### 12.1 Technical Debt
1. **Mock Data → Real API**: `tournaments.ts`, `leagues.ts`, `members.ts`, `notifications.ts` still use generated mock data instead of Supabase queries
2. **Single source of truth for public routes**: the middleware allowlist and the Supabase module's `redirectOptions.exclude` are maintained separately and can drift
3. **Error Handling**: Add error boundaries
4. **Loading States**: Standardize skeleton screens
5. **Testing**: Add Vitest + Playwright tests (none exist currently)

### 12.2 Feature Enhancements
1. **Real-time Updates**: Supabase realtime for live leaderboards
2. **Mobile App**: Capacitor/PWA wrapper
3. **Payment Integration**: Stripe for online payments
4. **Deck Registration**: OCR for decklist upload
5. **Pairings Algorithm**: Swiss tournament pairing
6. **Role enforcement**: Owner/Organizer/Judge/Writer roles exist in the data model but aren't yet gating routes or UI

### 12.3 Performance
1. **Pagination**: Server-side for large tables
2. **Virtual Scrolling**: For large participant lists
3. **Caching**: Redis for tournament data

---

## 13. Key Files Reference

### Configuration
| File | Purpose |
|------|---------|
| `nuxt.config.ts` | Framework configuration |
| `app/app.config.ts` | UI theme settings |
| `eslint.config.mjs` | Linting rules |
| `tsconfig.json` | TypeScript project references |

### Entry Points
| File | Purpose |
|------|---------|
| `app/app.vue` | Root Vue component |
| `app/layouts/default.vue` | Dashboard shell |
| `app/pages/index.vue` | Home dashboard |
| `app/middleware/auth.global.ts` | Auth protection |

### Critical Components
| File | Purpose |
|------|---------|
| `app/components/associates/list/AddModal.vue` | Complex registration form |
| `app/composables/useAssociates.ts` | Data fetching pattern |
| `app/pages/login.vue` | Authentication flow |
| `server/api/check-associate.post.ts` | Real Supabase-backed endpoint (email existence check) |

---

## 14. Conclusion

Pauperwave demonstrates a **well-architected modern Vue application** with:
- Clean feature-based organization
- Type-safe full-stack development
- Production-ready UI/UX with Nuxt UI
- Secure authentication flow
- GDPR-compliant data model
- Scalable component patterns

**Strengths:**
- Modern stack (Nuxt 4, Vue 3, TypeScript)
- Comprehensive feature set for MTG league management
- Good separation of concerns
- Thoughtful UX with keyboard shortcuts and quick actions

**Areas for Growth:**
- Test coverage (none currently)
- Real API implementation for tournaments/leagues/members/notifications (currently mocked)
- Documentation/comments in code
- Error handling sophistication
- Consolidating the two separate "public route" lists (middleware + Supabase module config)
