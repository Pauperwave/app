# Stores and Architecture

## Pinia Store Strategy

Based on the database schema, here's the breakdown of which data should be stored globally vs. fetched per page.

### ✅ Definitely Global — Pinia Stores

#### 1. Auth & Roles Store (`useAuthStore`)

**Source:** `auth.users` + `user_roles`

This is the most critical global state — the current user's `id`, their `app_role` (`admin`, `organizer`, `judge`, `player`), and auth session. Every page needs this to conditionally render UI and enforce permissions client-side. Supabase's `onAuthStateChange` feeds this store reactively.

#### 2. Current Player Store (`usePlayerStore`)

**Source:** `players_full` view (joins `players` + `pauperwave_associates`)

Once a user logs in, you need their `player_uuid`, `associate_uuid`, `nickname`, `first_name`, `last_name`, `is_active`, `is_banned` globally — for display in headers, to pre-fill forms, to check tournament eligibility, etc.

#### 3. Reference Data Store (`useReferenceStore`)

**Source:** Small, essentially static lookup tables

These feed dropdowns and labels all over the app. Fetch once on app init, never again:

- `mtg_formats` — used in tournament creation, player profiles, filters
- `mtg_color_combinations` — used in deck forms
- `deck_archetypes` — used in deck forms
- `ruleset__descriptions` — scoring category labels
- `event_locations` — small list, used in event creation

### ⚠️ Borderline — Depends on UX

#### 4. Rulesets (`useRulesetsStore`)

If admins frequently switch between rulesets when creating leagues/tournaments, a cached list makes sense. If it's a rare admin action, just use `useAsyncData` on those pages.

#### 5. Leagues List (`useLeaguesStore`)

If your app has a sidebar or nav that always shows active leagues, cache the list. If leagues are only shown on a dedicated page, fetch on demand.

#### 6. Active Tournament Context (`useTournamentStore`)

If users can be "inside" a running tournament (entering results, votes, kills in real-time), a store holding the current `tournament_uuid`, `round_current`, active `pairings`, and round `status` makes a lot of sense — especially combined with Supabase realtime subscriptions.

### ❌ Don't Store Globally — Fetch Per Page

- `pauperwave_associates` list → admin-only management page
- `pauperwave_payments` / `payment_receipts` → finance pages
- `event_attendees` → specific event page
- `tournament_registrations` / `standings` → specific tournament page
- `tournament_rounds` / `pairings` / `results` / `votes` / `kills` → tournament runner page
- `commander_decks` for a player → profile or deck management page
- `pauperwave_associate_renewals` → associate detail page

### Summary Table

| Store | Tables | Why Global |
|-------|--------|------------|
| `useAuthStore` | `auth.users`, `user_roles` | Permissions everywhere |
| `usePlayerStore` | `players`, `pauperwave_associates` | Identity everywhere |
| `useReferenceStore` | `mtg_formats`, `mtg_color_combinations`, `deck_archetypes`, `ruleset__descriptions`, `event_locations` | Static lookups, dropdowns |
| `useTournamentStore` | `tournaments`, `tournament_rounds`, `tournament_pairings` | Real-time tournament context |

---

## Realtime Strategy

### Which Tables Need Realtime

Not all tournament tables need it equally — there are two tiers:

#### 1. High Frequency (Active During a Round)

- `tournament_pairings` — status changes (pending → playing → completed)
- `tournament_round_results` — players entering their positions
- `tournament_votes` — players voting brew/play
- `tournament_kills` — players entering kill data
- `tournament_rounds` — round status (scheduled → in_progress → completed)

#### 2. Low Frequency (Admin/Organizer Actions)

- `tournaments` — status changes, round_current bump
- `tournament_registrations` — check-in status updates
- `tournament_standings` — recalculated after a round ends

### Pinia Store Structure

The key idea is: **one Supabase channel per tournament**, not one channel per table. Supabase lets you subscribe to multiple tables in a single channel, which is cleaner and more efficient.

```typescript
// stores/tournament.ts
export const useTournamentStore = defineStore('tournament', () => {
  const client = useSupabaseClient()

  const tournament = ref(null)
  const currentRound = ref(null)
  const pairings = ref([])
  const results = ref([])
  const votes = ref([])
  const kills = ref([])
  const standings = ref([])

  let realtimeChannel = null

  async function subscribeTo(tournamentUuid: string) {
    // 1. Initial fetch
    await loadTournamentData(tournamentUuid)

    // 2. One channel, multiple table listeners
    realtimeChannel = client
      .channel(`tournament:${tournamentUuid}`)

      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournament_rounds',
        filter: `tournament_uuid=eq.${tournamentUuid}`
      }, (payload) => handleRoundChange(payload))

      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournament_pairings',
        filter: `tournament_uuid=eq.${tournamentUuid}`
      }, (payload) => handlePairingChange(payload))

      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournament_round_results',
        filter: `tournament_uuid=eq.${tournamentUuid}`
      }, (payload) => handleResultChange(payload))

      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournament_votes',
        filter: `tournament_uuid=eq.${tournamentUuid}`
      }, (payload) => handleVoteChange(payload))

      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournament_kills',
        filter: `tournament_uuid=eq.${tournamentUuid}`
      }, (payload) => handleKillChange(payload))

      .subscribe()
  }

  function unsubscribe() {
    if (realtimeChannel) {
      client.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
  }

  return { tournament, currentRound, pairings, results, votes, kills, standings, subscribeTo, unsubscribe }
})
```

> **Note on `tournament_uuid` in child tables**: `tournament_pairings`, `tournament_round_results`, `tournament_votes`, and `tournament_kills` all carry a denormalized `tournament_uuid` column (with FK + index). This is intentional — it enables realtime filter params and direct queries without multi-level joins. The app is responsible for always passing `tournament_uuid` on insert (it's always available in context). No DB triggers are used for this.

### Lifecycle — Where to Subscribe/Unsubscribe

```typescript
// pages/tournaments/[uuid]/runner.vue
const store = useTournamentStore()
const route = useRoute()

onMounted(() => store.subscribeTo(route.params.uuid))
onUnmounted(() => store.unsubscribe())
```

### REPLICA IDENTITY Configuration

Supabase realtime `postgres_changes` requires tables to have `REPLICA IDENTITY FULL` set if you want the full `old` record on `UPDATE` and `DELETE` events:

```sql
ALTER TABLE tournament_rounds          REPLICA IDENTITY FULL;
ALTER TABLE tournament_pairings        REPLICA IDENTITY FULL;
ALTER TABLE tournament_round_results   REPLICA IDENTITY FULL;
ALTER TABLE tournament_votes           REPLICA IDENTITY FULL;
ALTER TABLE tournament_kills           REPLICA IDENTITY FULL;
```

Without this, `UPDATE` payloads only include new values, not previous state — fine for reactive syncing but problematic if you need to diff changes.

---

## Tournament Round State Machine

**Flow:** `scheduled` → pairings generated (preview) → admin approves → every player sees table → 3-minute countdown → game starts

This is a classic state machine problem. The round drives everything — all clients react to its status changes.

### Status Transition Flow

```
scheduled
   ↓  (admin generates pairings)
preview       → players see nothing yet, admin reviews table assignments
   ↓  (admin approves)
approved      → UPDATE tournament_rounds SET status='approved', pairings_approved_at=now()
               → realtime fires on all subscribed clients
               → every player now sees their table
               → countdown renders: 3:00 → 0:00
   ↓  (admin manually hits "Start Round" after 3min)
in_progress   → UPDATE tournament_rounds SET status='in_progress', started_at=now()
               → timer switches to round duration countdown
   ↓  (all results entered)
completed
```

### Timer Synchronization — Use Server Time, Not Client Time

Never trust `Date.now()` on the client for a shared timer. Two players on different devices will drift. Derive the countdown from `pairings_approved_at` stored on the server:

```typescript
// In your tournament store, when you receive the realtime update:
function handleRoundChange(payload) {
  const round = payload.new

  if (round.status === 'approved' && round.pairings_approved_at) {
    const approvedAt = new Date(round.pairings_approved_at).getTime()
    const gameStartsAt = approvedAt + 3 * 60 * 1000 // 3 minutes

    // Every client computes the same countdown from the same server timestamp
    startCountdown(gameStartsAt)
  }

  if (round.status === 'in_progress') {
    // Switch to round duration timer
    startRoundTimer(round.started_at)
  }
}

function startCountdown(targetTimestamp: number) {
  const tick = () => {
    const remaining = targetTimestamp - Date.now()
    if (remaining <= 0) {
      countdown.value = 0
      return
    }
    countdown.value = remaining
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
```

Every player, regardless of when they opened the page, computes the same remaining time from the same `pairings_approved_at` anchor.

### First Iteration Approach — Manual Timer

For the first iteration, the admin triggers the timer manually:

```
Admin approves pairings
   ↓
UPDATE status = 'approved', pairings_approved_at = now()
   ↓
Realtime fires → all players see table + 3:00 countdown

[3 minutes pass, countdown hits 0]
   ↓
Admin manually hits "Start Round" button
   ↓
UPDATE status = 'in_progress', started_at = now()
   ↓
Realtime fires → all players switch to round timer
```

The safety guard still applies — when admin hits "Start Round", check that status is still `approved` before updating. Prevents double clicks or race conditions.

### Player UI Per Status

| Round Status | Player UI |
|-------------|-----------|
| `scheduled` / `preview` | "Waiting for pairings..." |
| `approved` | "Go to Table 3 — Seat 2" + 3:00 countdown |
| `in_progress` | Table info stays visible + round timer |
| `completed` | "Enter your results" form unlocks |

> **Key insight:** Players only subscribe to `tournament_rounds` changes. Pairing data is fetched once when status hits `approved` — no need to make pairings themselves realtime for this flow.

---

## Dashboard & Navigation

### Install Dependencies First

Before writing any feature code, get your stack wired up:

- `@supabase/supabase-js` + `@nuxtjs/supabase`
- `pinia` + `@pinia/nuxt`
- Configure `.env` with Supabase URL and anon key
- Get auth working end-to-end (`useAuthStore` with session + role) before building any UI. Everything else depends on it.

### Role-Based Navigation Structure

| Section | Roles |
|---------|-------|
| Dashboard / Home | All |
| Associates | Admin |
| Payments | Admin |
| Leagues | Admin, Organizer |
| Events | Admin, Organizer |
| Tournament Runner | Admin, Organizer, Judge |
| Players | Admin, Organizer |
| My Profile / My Decks | Player |

Define navigation in a `navigation.ts` composable and conditionally render sidebar items based on `useAuthStore` role.

### Build Order

1. ✅ Auth (login, session, roles)
2. ✅ Global stores (`useAuthStore`, `usePlayerStore`, `useReferenceStore`)
3. ✅ Associates CRUD (simplest domain, no realtime)
4. ✅ Players management
5. ✅ Leagues & Events CRUD
6. ✅ Tournament creation + registration
7. ✅ Tournament runner (pairings, results, votes — realtime last)

> **Resist the urge to jump to the tournament runner first** — it depends on players, decks, rounds, and registrations all being in place.

### Tournament Runner Layout

The dashboard template is great for management pages, but the tournament runner (pairings view, live timer, result entry) will likely feel cramped in a standard dashboard panel. Plan for a **dedicated full-screen page** for it early — you can still use the same components but with a different layout.
