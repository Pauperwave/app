## Database schemas

The database is organized into several domains, each containing related tables:

- **Pauperwave domain**: Association management, payments, and membership tracking
- **Leagues & events domain**: League organization, event scheduling, and venue management
- **Tournaments domain**: Tournament structure, rounds, pairings, results, and standings
- **Players domain**: Player profiles, format preferences, and deck ownership
- **Decks domain**: Commander deck definitions, archetypes, and color combinations
- **MTG reference data**: Format definitions, color identities, and reference tables
- **Rulesets domain**: Point systems, scoring categories, and tournament rules
- **Users & roles domain**: Authentication, authorization, and role-based access control

### Instructions

- Maintain referential integrity with foreign keys and cascading rules.
- Apply schema changes via Supabase migrations to ensure version control and reproducibility.
- Test migrations in a development environment before applying to production.
- Use the provided constraint naming conventions when adding new constraints.
- Enable RLS on all new tables and define appropriate policies.

### Conventions

I respected a few naming conventions to keep things consistent:

- Table names are plural and use snake_case (e.g., `event_attendees`);
- Sub-tables are double underscores (e.g., `ruleset__descriptions`);
- Most tables have `uuid`, `created_at`, and `updated_at`. Exceptions: junction/enum-like tables (`ruleset__points`, `ruleset__descriptions`) omit timestamps as they are managed reference data.
- Constraint naming standardization with the following prefixes:
  - `pk_` (primary key)
  - `uq_` (unique)
  - `fk_` (foreign key)
  - `ck_` (check).
- Keep UUID for: exposed in API / URLs, referenced by other systems, user-facing entities, entities an admin links to directly
- Skip UUID for: Internal lookup / enum tables, Junction tables, Records always queried through a parent

- All tables have RLS enabled.

### Audit Trail Pattern

For security-sensitive tables where admin actions matter, the schema uses an audit trail pattern:

- `created_by uuid null` - FK to `pauperwave_associates(uuid)` tracking which associate created the record
- `updated_by uuid null` - FK to `pauperwave_associates(uuid)` tracking which associate last modified the record
- Both use `ON DELETE SET NULL` to preserve audit history even if the associate is deleted

FK target is `pauperwave_associates`, not `auth.users` — resolving "who" via `auth.users` would need the Supabase admin API to get a display name; going through `pauperwave_associates` instead means showing "who" in the UI is a direct join.

This pattern is applied to:
- `pauperwave_payments` (payment records)
- `pauperwave_wanted_cards` ("Carte Cercate" requests)
- `pauperwave_associates` (membership changes) — `updated_by` populated via `server/utils/auditColumns.ts` on every edit/approve/reject/restore; `created_by` stays null for the one insert path (`/tesseramento`'s public self-application), since the applicant has no associate record yet to attribute creation to at insert time
- `user_roles` (role assignments) — populated inside `assign_role()` itself, resolving the calling `super_admin`'s own associate uuid via `players.user_id = auth.uid()`; `created_by` set once on first assignment, `updated_by` refreshed on every reassignment

For general tables, `created_at` and `updated_at` timestamps provide basic change tracking.

### Deletion Philosophy

The schema prefers `ON DELETE RESTRICT` over `CASCADE` for parent-child relationships:

- **RESTRICT**: Forces intentional deletion order. Admin must delete child records first, surfacing errors clearly (e.g., "This league has 3 events. Delete them first.")
- **CASCADE**: Silent deletion chain - a misclick or bug can permanently wipe data without recovery path

Exceptions:
- `ON DELETE SET NULL` is used where orphaned records should persist (e.g., `tournaments.event_uuid` for standalone tournaments)
- `ON DELETE CASCADE` is used for junction tables where child records have no independent meaning

### Functions

#### `set_updated_at()`
Automatically updates the `updated_at` timestamp on row updates:

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Applied via triggers on all tables with `updated_at` columns.

#### `find_or_create_commander_deck()`
Atomically finds or creates a commander deck based on player and commander names. Handles both single and partner commanders with per-player uniqueness constraints.

### Realtime Configuration

For Supabase realtime to work correctly with UPDATE and DELETE events, the following tables require `REPLICA IDENTITY FULL` to receive full payloads:

```sql
ALTER TABLE tournament_rounds          REPLICA IDENTITY FULL;
ALTER TABLE tournament_pairings        REPLICA IDENTITY FULL;
ALTER TABLE tournament_round_results   REPLICA IDENTITY FULL;
ALTER TABLE tournament_votes           REPLICA IDENTITY FULL;
ALTER TABLE tournament_kills           REPLICA IDENTITY FULL;
```

Without this, `UPDATE` payloads only include new values, not previous state — fine for reactive syncing but problematic if you need to diff changes.

### Migration Notes

When applying schema changes to an existing database:

1. Create a new migration in Supabase
2. Use `ALTER TABLE` for column additions (non-breaking)
3. Use `ALTER TABLE ... RENAME CONSTRAINT` for constraint renames
4. For constraint changes that require recreation, use a transaction to drop and recreate
5. Test with `supabase db reset` locally before deploying
6. Back up production data before major structural changes

### Realtime Configuration

Tables enabled for Supabase Realtime (configured in Dashboard → Database → Replication):

**High Frequency (Active During Rounds):**
- `tournament_rounds` — round status changes
- `tournament_pairings` — pairing status updates
- `tournament_round_results` — players entering positions
- `tournament_votes` — brew/play votes
- `tournament_kills` — kill data entry

**Low Frequency (Admin/Organizer Actions):**
- `tournaments` — status changes, round_current updates
- `tournament_registrations` — check-in status
- `tournament_standings` — recalculated after rounds

**REPLICA IDENTITY FULL (for complete UPDATE/DELETE payloads):**
```sql
ALTER TABLE tournament_rounds          REPLICA IDENTITY FULL;
ALTER TABLE tournament_pairings        REPLICA IDENTITY FULL;
ALTER TABLE tournament_round_results   REPLICA IDENTITY FULL;
ALTER TABLE tournament_votes           REPLICA IDENTITY FULL;
ALTER TABLE tournament_kills           REPLICA IDENTITY FULL;
```

### About indexes

- Postgres defaults to a btree index when you omit the index method; you do not have to specify it;
- Use btree in almost all cases (range queries, ordering, equality, prefix searches). It's versatile and the recommended choice for columns like `associate_type`;
- Hash indexes are only for equality checks. They are less flexible, rarely necessary, and not recommended for general use.
- The recommendation is: keep the current indexes as btrees (either implicit or explicit). Use hash only if you have a proven, narrow-case need for equality-only lookups and have tested performance.

About database extensions:
- The `pgcrypto` extension is used for generating UUIDs with `gen_random_uuid()`;
- The `pg_trgm` extension is used for fuzzy text search capabilities, particularly in the `pauperwave_associates` table;
- The `unaccent` extension is used to create accent-insensitive text search indexes.

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
```

Below are the detailed table definitions for each domain.

### 1. Pauperwave domain

- `pauperwave_associates`: Stores information about associates in the PauperWave community.

```sql
-- 1. Table definition
CREATE TABLE public.pauperwave_associates (
  id bigint generated by default as identity not null,
  uuid uuid not null default gen_random_uuid(),

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  membership_request_status text not null,
  request_date timestamptz not null,
  payment_date date null,
  association_date date null,
  pauperwave_associate_number text null,

  consent_data boolean not null default false,
  consent_social boolean not null default false,
  has_read_statute boolean not null default false,
  has_acknowledged_surveillance_notice boolean not null default false,

  associate_type text null,

  first_name text not null,
  last_name text not null,
  tax_code text null,
  phone_number text null,
  email_address text not null,

  born_location text null,
  born_date date not null,
  born_province text null,
  born_state text null,

  residency_address text not null,
  residency_house_number text null,
  residency_city text not null,
  residency_province text not null,
  residency_cap text not null,

  mtgo_nickname text null,
  mtga_nickname text null,

  created_by uuid null,
  updated_by uuid null,
  associate_status text null,

  CONSTRAINT pk_pauperwave_associates PRIMARY KEY (id),
  CONSTRAINT uq_pauperwave_associates_phone_number_key UNIQUE (phone_number),
  CONSTRAINT uq_pauperwave_associates_email_key UNIQUE (email_address),
  CONSTRAINT uq_pauperwave_associates_tax_code_key UNIQUE (tax_code),
  CONSTRAINT uq_pauperwave_associates_pauperwave_associate_number_key UNIQUE (pauperwave_associate_number),
  CONSTRAINT uq_pauperwave_associates_uuid_key UNIQUE (uuid),
  CONSTRAINT ck_pauperwave_associates_membership_request_status CHECK (
    membership_request_status = ANY (ARRAY['pending', 'approved', 'rejected'])
  ),
  CONSTRAINT ck_pauperwave_associates_associate_status CHECK (
    associate_status = ANY (ARRAY['active', 'inactive', 'suspended'])
  ),
  CONSTRAINT fk_pauperwave_associates_created_by FOREIGN KEY (created_by)
    REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT fk_pauperwave_associates_updated_by FOREIGN KEY (updated_by)
    REFERENCES auth.users(id) ON DELETE SET NULL
) tablespace pg_default;

-- 2. Indexes for faster lookups
-- Soci attivi
CREATE INDEX IF NOT EXISTS idx_pauperwave_associates_active
  ON pauperwave_associates (association_date)
  where association_date is not null;

CREATE INDEX IF NOT EXISTS idx_pauperwave_associates_associate_type
  ON public.pauperwave_associates (associate_type);
CREATE INDEX IF NOT EXISTS idx_pauperwave_associates_residency_city
  ON public.pauperwave_associates (residency_city);
CREATE INDEX IF NOT EXISTS idx_pauperwave_associates_born_date
  ON public.pauperwave_associates (born_date);

-- Fuzzy search indexes (using pg_trgm extension)
-- Create trigram GIN indexes ON last_name and first_name (accent-insensitive, case-insensitive)
CREATE INDEX IF NOT EXISTS idx_associates_last_name_unaccent_trgm
  ON public.pauperwave_associates
  USING gin (lower(unaccent(coalesce(last_name,''))) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_associates_first_name_unaccent_trgm
  ON public.pauperwave_associates
  USING gin (lower(unaccent(coalesce(first_name,''))) gin_trgm_ops);
-- Combined index for fullname search (last_name + first_name) trigram index (accent-insensitive):
CREATE INDEX IF NOT EXISTS idx_pauperwave_associates_fullname_unaccent_trgm
  ON public.pauperwave_associates
  USING gin ((lower(unaccent(coalesce(first_name, '') || ' ' || coalesce(last_name, '')))) gin_trgm_ops);

-- 3. Enable Row-Level Security (policies defined in 3-RLS-policies.md)
ALTER TABLE public.pauperwave_associates ENABLE ROW LEVEL SECURITY;

-- 4. Trigger for updated_at
CREATE TRIGGER trg_associates_updated_at
BEFORE UPDATE ON pauperwave_associates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

Notes:
- `UNIQUE` constraints (`phone_number`, `email`, `tax_code`, `pauperwave_associate_number`, `uuid`) already create unique indexes, no extra index needed for those;
- `pauperwave_associate_number` is `text unique null`. Be aware: in Postgres, multiple NULLs are allowed in a `unique` column.

```sql
-- Example search: prioritize surname similarity, then name similarity
-- Replace 'search_surname' and 'search_name' with your input values
WITH params AS (
  SELECT
    lower(unaccent('search_surname')) AS s_surname,
    lower(unaccent('search_name'))   AS s_name
)
SELECT a.*, 
  similarity(lower(unaccent(coalesce(a.last_name,''))), p.s_surname) AS surname_score,
  similarity(lower(unaccent(coalesce(a.first_name,''))), p.s_name)       AS name_score
FROM public.pauperwave_associates a, params p
WHERE (lower(unaccent(coalesce(a.last_name,''))) % p.s_surname) -- trigram match ON surname (fast via index)
   OR (lower(unaccent(coalesce(a.first_name,''))) % p.s_name)   -- fallback: match ON name
ORDER BY surname_score DESC, name_score DESC
LIMIT 5;
```

- `pauperwave_associate_renewals`: Tracks renewals for PauperWave associates.

Domande alla quale deve rispondere la tabella:
- "did this associate renew in year X, and on what date?"

```sql
-- 1. Table definition
CREATE TABLE public.pauperwave_associate_renewals (
  id bigint generated by default as identity not null,
  uuid uuid not null default gen_random_uuid(),
  associate_uuid uuid not null,
  
  renewal_year smallint not null,
  renewal_date date not null default CURRENT_DATE,
  
  CONSTRAINT pk_pauperwave_membership_renewals_pkey primary key (id),
  CONSTRAINT uq_pauperwave_associate_renewals_uuid_key unique (uuid),
  -- un associato puo rinnovare solo una volta per anno
  CONSTRAINT uq_pauperwave_associate_renewals_unique_year unique (associate_uuid, renewal_year),
  CONSTRAINT fk_pauperwave_associate_renewals_associate_uuid_fkey
    foreign KEY (associate_uuid)
    references pauperwave_associates (uuid)
    ON update CASCADE
    ON delete RESTRICT
) tablespace pg_default;

-- 2. Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_pauperwave_renewals_associate_uuid
  ON public.pauperwave_associate_renewals (associate_uuid);

-- which associates renewed in year X
CREATE INDEX IF NOT EXISTS idx_pauperwave_renewals_renewal_year
  ON public.pauperwave_associate_renewals (renewal_year);

-- 3. Enable Row-Level Security
ALTER TABLE public.pauperwave_associate_renewals ENABLE ROW LEVEL SECURITY;
```

- `pauperwave_payments`: Manages payments related to PauperWave services.

```sql
-- 1. Table definition
CREATE TABLE public.pauperwave_payments (
  id bigint generated by default as identity not null,
  uuid uuid not null default gen_random_uuid(),
  
  associate_uuid uuid null,
  payer_name text null,
  payer_surname text null,
  payer_email text null,
  payer_tax_code text null,
  
  payment_date timestamp with time zone not null default now(),
  payment_amount numeric(10, 2) not null default 0,
  payment_method text not null default 'Cash'::text,
  payment_type text not null default 'Donation'::text,

  event_uuid uuid null, -- payment for an event as a whole
  tournament_uuid uuid null, -- payment for a specific tournament

  event_name text null,
  notes text not null default ''::text,

  CONSTRAINT pk_pauperwave_payments_pkey primary key (id),
  CONSTRAINT uq_pauperwave_payments_uuid_key unique (uuid),
  -- una sola FK — scegli il comportamento che vuoi
  CONSTRAINT fk_pauperwave_payments_associate_uuid_fkey foreign KEY (associate_uuid)
    references pauperwave_associates (uuid)
    ON update CASCADE
    ON delete SET NULL,  -- ha senso: se l'associato viene eliminato, il pagamento rimane
  CONSTRAINT fk_pauperwave_payments_event_uuid_fkey foreign KEY (event_uuid)
    references events (uuid)
    ON update CASCADE
    ON delete SET NULL,
  CONSTRAINT fk_pauperwave_payments_tournament_uuid_fkey foreign KEY (tournament_uuid)
    references tournaments (uuid)
    ON update CASCADE
    ON delete SET NULL,

  CONSTRAINT ck_payer_info check (
    (
      (associate_uuid is not null)
      or (
        (payer_name is not null)
        and (payer_surname is not null)
        and (payer_email is not null)
      )
    )
  ),
  CONSTRAINT ck_payment_method check (
    (
      payment_method = any (array['PayPal'::text, 'POS'::text, 'Cash'::text])
    )
  ),
  CONSTRAINT ck_payment_type check (
    (
      payment_type = any (
        array[
          'Association Fee'::text,
          'Donation'::text,
          'Event Fee'::text,
          'Tournament Fee'::text
        ]
      )
    )
  ),
  CONSTRAINT ck_payments_context check (
    NOT (event_uuid IS NOT NULL AND tournament_uuid IS NOT NULL)
  )
) tablespace pg_default;

-- 2. Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_pauperwave_payments_payment_date
  ON public.pauperwave_payments (payment_date);

CREATE INDEX IF NOT EXISTS idx_pauperwave_payments_associate_uuid
  ON public.pauperwave_payments (associate_uuid);

-- 3. Enable Row-Level Security
ALTER TABLE public.pauperwave_payments ENABLE ROW LEVEL SECURITY;
```

**Note**: The `pauperwave_payments` table includes a check CONSTRAINT (`ck_payer_info`) to ensure that either an `associate_uuid` is provided or all payer details (`payer_name`, `payer_surname`, and `payer_email`) are filled out. This ensures that there is always sufficient information about the payer. Receipt generation and email delivery tracking is handled by the separate `payment_receipts` table.

- `payment_receipts`: Tracks receipt generation and email delivery for payments. Supports multiple delivery attempts, failure tracking, and PDF storage references.

```sql
-- 1. Table definition
CREATE TABLE public.payment_receipts (
  id bigint generated by default as identity not null,
  uuid uuid not null default gen_random_uuid(),

  payment_uuid uuid not null,

  pdf_url text null,                        -- Supabase Storage URL
  sent_at timestamptz null,                 -- null = not yet sent
  sent_to_email text not null,
  status text not null default 'pending',   -- pending, sent, failed
  error_message text null,                  -- populated on failure

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  CONSTRAINT pk_payment_receipts primary key (id),
  CONSTRAINT uq_payment_receipts_uuid unique (uuid),
  CONSTRAINT fk_payment_receipts_payment_uuid foreign key (payment_uuid)
    references pauperwave_payments (uuid)
    ON update cascade
    ON delete cascade,
  CONSTRAINT ck_payment_receipts_status check (
    status = any (array['pending', 'sent', 'failed'])
  )
) tablespace pg_default;

-- 2. Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_receipts_payment_uuid
  ON public.payment_receipts (payment_uuid);

CREATE INDEX IF NOT EXISTS idx_payment_receipts_status
  ON public.payment_receipts (status);

-- 3. Trigger for updated_at
CREATE TRIGGER trg_payment_receipts_updated_at
BEFORE UPDATE ON public.payment_receipts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Enable Row-Level Security
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;
```

### 2. Leagues & events domain

- `organizations`: Stores information about organizations that can organize events (associations, shops like Magman, Fantasia, etc.).

```sql
-- 1. Table definition
CREATE TABLE public.organizations (
  id bigint generated by default as identity not null,
  uuid uuid not null default gen_random_uuid(),

  name text not null,
  type text not null, -- 'association', 'shop', 'other'
  description text null,

  -- Contact information
  email text null,
  phone text null,
  website_url text null,

  -- Address
  address text null,
  city text null,
  province text null,
  cap text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  CONSTRAINT pk_organizations primary key (id),
  CONSTRAINT uq_organizations_uuid unique (uuid),
  CONSTRAINT uq_organizations_name unique (name),
  CONSTRAINT ck_organizations_type check (
    type = any (array['association', 'shop', 'other'])
  )
) tablespace pg_default;

-- 2. Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_type
  ON public.organizations (type);

-- 3. Trigger for updated_at
CREATE TRIGGER trg_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Enable Row-Level Security
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
```

- `leagues`: Stores information about leagues in the PauperWave community.

**Leagues and events are independent entities — they are not linked to each other.**

- A **league** is a series of Commander tournaments (typically 5 rounds).
- An **event** is a game day that can host multiple tournaments of different formats (cEDH, EDH, Commander Cube, etc.).

A tournament can be associated with a league, an event, both, or neither (standalone). The `league_uuid` and `event_uuid` on `tournaments` are both nullable.

Deletion behavior:
- Deleting a **league** is `RESTRICT` — blocked if any tournaments still reference it.
- Deleting an **event** uses `SET NULL` on tournaments — tournaments survive and become standalone.

`leagues`, `events`, and `tournaments` all support **soft-delete** via `deleted_at`. The application sets `deleted_at = now()` instead of physically deleting. Queries filter `WHERE deleted_at IS NULL` by default.

```sql
-- 1. Table definition
CREATE TABLE public.leagues (
  id bigint generated by default as identity not null,
  uuid uuid not null default gen_random_uuid(),

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  name text not null,
  status text not null,
  deleted_at timestamptz null,

  season text null,
  starts_at date null,
  ends_at date null,
  ruleset_uuid uuid null,
  
  CONSTRAINT pk_leagues_pkey primary key (id),
  CONSTRAINT uq_leagues_uuid_key unique (uuid),
  CONSTRAINT ck_leagues_status check (
    status = any (array['draft', 'active', 'completed', 'cancelled'])
  ),
  CONSTRAINT fk_leagues_ruleset_uuid_fkey foreign KEY (ruleset_uuid)
    references rulesets (uuid)
    ON update CASCADE
    ON delete SET NULL  -- a league can exist without a ruleset

) tablespace pg_default;

-- 2. Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_leagues_ruleset_uuid
  ON public.leagues using btree (ruleset_uuid) tablespace pg_default;

-- 3. Enable Row-Level Security
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;

-- 4. Trigger for updated_at
CREATE TRIGGER trg_leagues_updated_at
BEFORE UPDATE ON public.leagues
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

- `events`: Manages events related to PauperWave. An event can host multiple tournaments.

```sql
-- 1. Table definition
CREATE TABLE public.events (
  id bigint generated by default as identity not null,
  uuid uuid not null default gen_random_uuid(),
  organizer_uuid uuid not null,
  
  status text not null,
  name text not null,
  deleted_at timestamptz null,

  starts_at timestamptz null,
  ends_at timestamptz null,

  -- TODO creare tabella delle locations
  -- location text null,
  -- ✅ referenzia l'uuid della location
  location_uuid uuid null,

  companion_app_code text null,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  CONSTRAINT pk_events_pkey primary key (id),
  CONSTRAINT uq_events_uuid_key unique (uuid),
  CONSTRAINT ck_events_status check (
    status = any (array['draft', 'published', 'ongoing', 'completed', 'cancelled'])
  ),
  -- CONSTRAINT events_location_fkey foreign KEY (location) references event_locations (name)
  CONSTRAINT fk_events_location_uuid_fkey foreign KEY (location_uuid)
    references event_locations (uuid)
    ON update CASCADE
    ON delete SET NULL,
  CONSTRAINT fk_events_organizer_uuid_fkey foreign KEY (organizer_uuid)
    references organizations (uuid)
    ON update CASCADE
    ON delete RESTRICT
) tablespace pg_default;

-- 2. Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_events_location_uuid
  ON public.events (location_uuid);
CREATE INDEX IF NOT EXISTS idx_events_organizer_uuid
  ON public.events (organizer_uuid);

-- 3. Trigger for updated_at
CREATE TRIGGER trg_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Enable Row-Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
```


- `event_attendees`: Tracks attendees for PauperWave events.

```sql
-- 1. Table definition
CREATE TABLE public.event_attendees (
  id bigint generated by default as identity not null,
  uuid uuid not null default gen_random_uuid(),
  player_uuid uuid not null,
  event_uuid uuid not null,

  role text not null default 'player'::text,
  status text not null default 'registered'::text,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  CONSTRAINT pk_event_participants_pkey primary key (id),
  CONSTRAINT uq_event_attendees_uuid_key unique (uuid),

  -- Ensure a player can register only once per event
  CONSTRAINT uq_event_attendees_unique UNIQUE (event_uuid, player_uuid),

  CONSTRAINT fk_event_attendees_event_uuid_fkey foreign KEY (event_uuid)
    references events (uuid)
    ON update CASCADE
    ON delete CASCADE,

  CONSTRAINT fk_event_attendees_player_uuid_fkey foreign KEY (player_uuid)
    references players (uuid)
    ON update CASCADE
    ON delete RESTRICT,
  
  CONSTRAINT ck_event_attendees_role_check check (
    role = any (array['player'::text, 'organizer'::text, 'judge'::text])
  ),
  CONSTRAINT ck_event_attendees_status_check check (
    status = any (
      array[
        'registered'::text,
        'checked_in'::text,
        'participated'::text,
        'no_show'::text
      ]
    )
  )
) tablespace pg_default;

-- 2. Indexes for faster lookups

-- All players for an event
CREATE INDEX IF NOT EXISTS idx_event_attendees_player_uuid
  ON public.event_attendees (player_uuid);
-- All events for a player
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_uuid
  ON public.event_attendees (event_uuid);

-- 3. Trigger for updated_at
CREATE TRIGGER trg_event_attendees_updated_at
BEFORE UPDATE ON public.event_attendees
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Enable Row-Level Security
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
```

- `event_locations`: Stores locations for PauperWave events.

```sql
-- 1. Table definition
CREATE TABLE public.event_locations (
  id bigint generated by default as identity not null,
  uuid uuid not null default gen_random_uuid(),

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  name text not null,
  address text not null,
  city text not null,
  province text not null,
  country text not null default 'Italy'::text,
  postal_code text not null,
  phone text null,
  email text null,
  website text null,

  CONSTRAINT pk_event_locations_pkey primary key (id),
  CONSTRAINT uq_event_locations_name_key unique (name),
  CONSTRAINT uq_event_locations_uuid_key unique (uuid)
) tablespace pg_default;

ALTER TABLE public.event_locations ENABLE ROW LEVEL SECURITY;

-- 4. Trigger for updated_at
CREATE TRIGGER trg_event_locations_updated_at
BEFORE UPDATE ON public.event_locations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 3. Tournaments domain

- `tournaments`: Stores information about tournaments. Each tournament:
    - optionally belongs to an **event** (a multi-format game day),
    - optionally belongs to a **league** (a Commander league series, typically 5 tournaments),
    - can be **standalone** — not linked to either,
    - consists of multiple rounds,
    - includes tournament-specific details such as format, status, datetime, and description.

```sql
-- 1. Table definition
CREATE TABLE public.tournaments (
  id bigint generated by default as identity not null, 
  
  uuid uuid not null default gen_random_uuid(),
  event_uuid uuid null, -- null = standalone or league-only tournament
  league_uuid uuid null,
  
  status text not null,
  name text not null,
  description text null,
  deleted_at timestamptz null,
  datetime timestamp with time zone null,
  -- format text not null,
  format_uuid uuid not null,
  
  round_count smallint null,
  round_current smallint null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  CONSTRAINT pk_tournaments_pkey primary key (id),
  CONSTRAINT uq_tournaments_uuid_key unique (uuid),
  CONSTRAINT ck_tournaments_status check (
    status = any (array['draft', 'registration_open', 'in_progress', 'completed', 'cancelled'])
  ),
  CONSTRAINT fk_tournaments_event_uuid_fkey foreign KEY (event_uuid)
    references events (uuid)
    ON update CASCADE
    ON delete SET NULL,
  CONSTRAINT fk_tournaments_format_uuid_fkey foreign KEY (format_uuid)
    references mtg_formats (uuid)
    ON update CASCADE
    ON delete RESTRICT,
  CONSTRAINT fk_tournaments_league_uuid_fkey foreign KEY (league_uuid)
    references leagues (uuid)
    ON update CASCADE
    ON delete RESTRICT  -- admin must delete tournaments before deleting a league
) tablespace pg_default;

-- 2. Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_tournaments_format_uuid
  ON public.tournaments (format_uuid);

CREATE INDEX IF NOT EXISTS idx_tournaments_event_uuid
  ON public.tournaments using btree (event_uuid) tablespace pg_default;

CREATE INDEX IF NOT EXISTS idx_tournaments_league_uuid
  ON public.tournaments using btree (league_uuid) tablespace pg_default;

-- 3. Trigger for updated_at
CREATE TRIGGER trg_tournaments_updated_at
BEFORE UPDATE ON public.tournaments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Enable Row-Level Security
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
```

- `tournament_rounds`: Manages rounds within tournaments. Each round:
    - belongs to a tournament,
    - has a round number (1, 2, 3, etc.),
    - tracks the round status and timing.

```sql
-- 1. Table definition
CREATE TABLE public.tournament_rounds (
  id bigint generated by default as identity not null,
  uuid uuid not null default gen_random_uuid(),
  tournament_uuid uuid not null,

  round_number smallint not null,
  status text not null default 'scheduled',

  pairings_approved_at timestamptz null, -- anchor for the 3min countdown
  started_at timestamptz null,
  ended_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  CONSTRAINT pk_tournament_rounds_pkey primary key (id),
  CONSTRAINT uq_tournament_rounds_uuid_key unique (uuid),
  CONSTRAINT fk_tournament_rounds_tournament_uuid_fkey foreign key (tournament_uuid)
    references tournaments (uuid)
    ON update cascade
    ON delete cascade,
  CONSTRAINT ck_tournament_rounds_status_check check (
    status = any (
      array[
        'scheduled'::text,
        'preview'::text,     -- pairings generated, admin reviewing
        'approved'::text,    -- players can see tables, 3min countdown
        'in_progress'::text, -- game live
        'completed'::text
      ]
    )
  ),
  CONSTRAINT uq_tournament_rounds_unique_round UNIQUE (tournament_uuid, round_number)
) tablespace pg_default;

-- 2. Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_tournament_rounds_tournament_uuid
  ON public.tournament_rounds (tournament_uuid);

-- 3. Trigger for updated_at
CREATE TRIGGER trg_tournament_rounds_updated_at
BEFORE UPDATE ON public.tournament_rounds
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Enable Row-Level Security
ALTER TABLE public.tournament_rounds ENABLE ROW LEVEL SECURITY;
```

- `tournament_pairings`: Tracks pairings for matches in tournament rounds. For Commander (3-4 player games), each pairing includes exactly 3 or 4 players.

```sql
-- 1. Table definition
CREATE TABLE public.tournament_pairings (
  id bigint generated by default as identity not null,
  uuid uuid not null default gen_random_uuid(),
  round_uuid uuid not null,
  tournament_uuid uuid not null, -- denormalized for realtime filtering and RLS

  table_number smallint null,

  player1_uuid uuid null,
  player2_uuid uuid null,
  player3_uuid uuid null,
  player4_uuid uuid null,

  status text not null default 'pending',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  CONSTRAINT pk_tournament_pairings_pkey primary key (id),
  CONSTRAINT uq_tournament_pairings_uuid_key unique (uuid),
  CONSTRAINT fk_tournament_pairings_round_uuid_fkey foreign key (round_uuid)
    references tournament_rounds (uuid)
    ON update cascade
    ON delete cascade,
  CONSTRAINT fk_tournament_pairings_tournament_uuid_fkey foreign key (tournament_uuid)
    references tournaments (uuid)
    ON update cascade
    ON delete cascade,
  CONSTRAINT fk_tournament_pairings_player1_fkey foreign key (player1_uuid)
    references players (uuid) ON update cascade ON delete RESTRICT,
  CONSTRAINT fk_tournament_pairings_player2_fkey foreign key (player2_uuid)
    references players (uuid) ON update cascade ON delete RESTRICT,
  CONSTRAINT fk_tournament_pairings_player3_fkey foreign key (player3_uuid)
    references players (uuid) ON update cascade ON delete RESTRICT,
  CONSTRAINT fk_tournament_pairings_player4_fkey foreign key (player4_uuid)
    references players (uuid) ON update cascade ON delete RESTRICT,
  CONSTRAINT ck_tournament_pairings_status_check check (
    status = any (array['pending'::text, 'playing'::text, 'completed'::text])
  ),
  -- Commander format only: exactly 3 or 4 players per table (intentional by design)
  CONSTRAINT ck_tournament_pairings_player_count check (
    (player1_uuid is not null and player2_uuid is not null and player3_uuid is not null and player4_uuid is null)
    or
    (player1_uuid is not null and player2_uuid is not null and player3_uuid is not null and player4_uuid is not null)
  )
) tablespace pg_default;

-- 2. Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_tournament_pairings_round_uuid
  ON public.tournament_pairings (round_uuid);
CREATE INDEX IF NOT EXISTS idx_tournament_pairings_tournament_uuid
  ON public.tournament_pairings (tournament_uuid);
CREATE INDEX IF NOT EXISTS idx_tournament_pairings_player1
  ON public.tournament_pairings (player1_uuid);
CREATE INDEX IF NOT EXISTS idx_tournament_pairings_player2
  ON public.tournament_pairings (player2_uuid);
CREATE INDEX IF NOT EXISTS idx_tournament_pairings_player3
  ON public.tournament_pairings (player3_uuid);
CREATE INDEX IF NOT EXISTS idx_tournament_pairings_player4
  ON public.tournament_pairings (player4_uuid);

-- 3. Trigger for updated_at
CREATE TRIGGER trg_tournament_pairings_updated_at
BEFORE UPDATE ON public.tournament_pairings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Enable Row-Level Security
ALTER TABLE public.tournament_pairings ENABLE ROW LEVEL SECURITY;
```

- `tournament_round_results`: Records results of matches in tournament rounds. Each record represents a player's performance in a specific pairing.

```sql
-- 1. Table definition
CREATE TABLE public.tournament_round_results (
  id bigint generated by default as identity not null,
  uuid uuid not null default gen_random_uuid(),
  pairing_uuid uuid not null,
  tournament_uuid uuid not null, -- denormalized for realtime filtering and RLS
  player_uuid uuid not null,

  position smallint null,
  commander_deck_uuid uuid null,
  created_at timestamptz not null default now(),

  CONSTRAINT pk_tournament_round_results_pkey primary key (id),
  CONSTRAINT uq_tournament_round_results_uuid_key unique (uuid),
  CONSTRAINT fk_tournament_round_results_pairing_uuid_fkey foreign key (pairing_uuid)
    references tournament_pairings (uuid)
    ON update cascade
    ON delete cascade,
  CONSTRAINT fk_tournament_round_results_tournament_uuid_fkey foreign key (tournament_uuid)
    references tournaments (uuid)
    ON update cascade
    ON delete cascade,
  CONSTRAINT fk_tournament_round_results_player_uuid_fkey foreign key (player_uuid)
    references players (uuid)
    ON update cascade
    ON delete RESTRICT,
  CONSTRAINT fk_tournament_round_results_commander_deck_uuid_fkey foreign key (commander_deck_uuid)
    references commander_decks (uuid)
    ON update cascade
    ON delete set null,
  CONSTRAINT uq_tournament_round_results_unique_player_per_pairing UNIQUE (pairing_uuid, player_uuid),
  CONSTRAINT ck_tournament_round_results_position_check check (
    position is null or position = any (array[1, 2, 3, 4])
  )
) tablespace pg_default;

-- 2. Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_tournament_round_results_pairing_uuid
  ON public.tournament_round_results (pairing_uuid);
CREATE INDEX IF NOT EXISTS idx_tournament_round_results_tournament_uuid
  ON public.tournament_round_results (tournament_uuid);
CREATE INDEX IF NOT EXISTS idx_tournament_round_results_player_uuid
  ON public.tournament_round_results (player_uuid);

-- 3. Enable Row-Level Security
ALTER TABLE public.tournament_round_results ENABLE ROW LEVEL SECURITY;
```

- `tournament_votes`: Records votes between players in a pairing. Players vote for other players' decks (brew) and play style.

```sql
-- 1. Table definition
CREATE TABLE public.tournament_votes (
  id bigint generated by default as identity not null,
  uuid uuid not null default gen_random_uuid(),
  pairing_uuid uuid not null,
  tournament_uuid uuid not null, -- denormalized for realtime filtering and RLS
  voter_uuid uuid not null,
  voted_player_uuid uuid not null,

  vote_type text not null,
  created_at timestamptz not null default now(),

  CONSTRAINT pk_tournament_votes_pkey primary key (id),
  CONSTRAINT uq_tournament_votes_uuid_key unique (uuid),
  CONSTRAINT fk_tournament_votes_pairing_uuid_fkey foreign key (pairing_uuid)
    references tournament_pairings (uuid)
    ON update cascade
    ON delete cascade,
  CONSTRAINT fk_tournament_votes_tournament_uuid_fkey foreign key (tournament_uuid)
    references tournaments (uuid)
    ON update cascade
    ON delete cascade,
  CONSTRAINT fk_tournament_votes_voter_uuid_fkey foreign key (voter_uuid)
    references players (uuid) ON update cascade ON delete RESTRICT,
  CONSTRAINT fk_tournament_votes_voted_player_uuid_fkey foreign key (voted_player_uuid)
    references players (uuid) ON update cascade ON delete RESTRICT,
  CONSTRAINT uq_tournament_votes_unique_vote UNIQUE (pairing_uuid, voter_uuid, voted_player_uuid, vote_type),
  CONSTRAINT ck_tournament_votes_vote_type_check check (
    vote_type = any (array['brew'::text, 'play'::text])
  ),
  CONSTRAINT ck_tournament_votes_no_self_vote check (voter_uuid != voted_player_uuid)
) tablespace pg_default;

-- 2. Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_tournament_votes_pairing_uuid
  ON public.tournament_votes (pairing_uuid);
CREATE INDEX IF NOT EXISTS idx_tournament_votes_tournament_uuid
  ON public.tournament_votes (tournament_uuid);
CREATE INDEX IF NOT EXISTS idx_tournament_votes_voter_uuid
  ON public.tournament_votes (voter_uuid);
CREATE INDEX IF NOT EXISTS idx_tournament_votes_voted_player_uuid
  ON public.tournament_votes (voted_player_uuid);

-- 3. Enable Row-Level Security
ALTER TABLE public.tournament_votes ENABLE ROW LEVEL SECURITY;
```

- `tournament_kills`: Records specific kill relationships between players in a pairing. Tracks which player killed which opponent.

```sql
-- 1. Table definition
CREATE TABLE public.tournament_kills (
  id bigint generated by default as identity not null,
  uuid uuid not null default gen_random_uuid(),
  pairing_uuid uuid not null,
  tournament_uuid uuid not null, -- denormalized for realtime filtering and RLS
  killer_uuid uuid not null,
  killed_player_uuid uuid not null,
  created_at timestamptz not null default now(),

  CONSTRAINT pk_tournament_kills_pkey primary key (id),
  CONSTRAINT uq_tournament_kills_uuid_key unique (uuid),
  CONSTRAINT fk_tournament_kills_pairing_uuid_fkey foreign key (pairing_uuid)
    references tournament_pairings (uuid)
    ON update cascade
    ON delete cascade,
  CONSTRAINT fk_tournament_kills_tournament_uuid_fkey foreign key (tournament_uuid)
    references tournaments (uuid)
    ON update cascade
    ON delete cascade,
  CONSTRAINT fk_tournament_kills_killer_uuid_fkey foreign key (killer_uuid)
    references players (uuid) ON update cascade ON delete RESTRICT,
  CONSTRAINT fk_tournament_kills_killed_player_uuid_fkey foreign key (killed_player_uuid)
    references players (uuid) ON update cascade ON delete RESTRICT,
  CONSTRAINT uq_tournament_kills_unique_kill UNIQUE (pairing_uuid, killer_uuid, killed_player_uuid),
  CONSTRAINT ck_tournament_kills_no_self_kill check (killer_uuid != killed_player_uuid)
) tablespace pg_default;

-- 2. Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_tournament_kills_pairing_uuid
  ON public.tournament_kills (pairing_uuid);
CREATE INDEX IF NOT EXISTS idx_tournament_kills_tournament_uuid
  ON public.tournament_kills (tournament_uuid);
CREATE INDEX IF NOT EXISTS idx_tournament_kills_killer_uuid
  ON public.tournament_kills (killer_uuid);
CREATE INDEX IF NOT EXISTS idx_tournament_kills_killed_player_uuid
  ON public.tournament_kills (killed_player_uuid);

-- 3. Enable Row-Level Security
ALTER TABLE public.tournament_kills ENABLE ROW LEVEL SECURITY;
```

- `tournament_kills_summary`: View that aggregates kill counts per player per pairing. Derives the number of kills from the tournament_kills table.

```sql
CREATE VIEW public.tournament_kills_summary
WITH (security_invoker = true) -- RLS on tournament_kills is enforced per calling user
AS
SELECT
  pairing_uuid,
  killer_uuid,
  COUNT(*) AS kill_count
FROM public.tournament_kills
GROUP BY pairing_uuid, killer_uuid;
```

- `tournament_registrations`: Stores registration records for tournaments. Each registration:
    - links a player to a specific tournament,
    - includes registration details such as date, status, and payment info if relevant.

Main queries I'll likely run into the project:
1. Look up a registration by its registration_uuid (e.g. when a player/admin clicks a link to approve/remove).
2. Get all registrations for a tournament (common for admins).
3. Get all registrations for a player (common for players viewing their history).
4. (Optional) Check if a player is already registered for a tournament — already enforced by the unique CONSTRAINT, but an index helps performance.

```sql
-- 1. Table definition
CREATE TABLE public.tournament_registrations (
  id bigint generated by default as identity primary key,
  uuid uuid not null default gen_random_uuid(),
  tournament_uuid uuid not null,
  player_uuid uuid not null,

  registered_at timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  status        text not null default 'registered',

  CONSTRAINT ck_tournament_registrations_status_check check (
    status = any (
      array[
        'registered'::text,   -- Signed up and paid
        'checked_in'::text,    -- Arrived at venue
        'in_queue'::text,      -- Present, waiting for pairings
        'participated'::text,  -- Completed tournament
        'no_show'::text        -- Didn't show up
      ]
    )
  ),
  CONSTRAINT uq_tournament_registrations_uuid_key UNIQUE (uuid),
  CONSTRAINT fk_tournament_registrations_player_uuid_fkey
    foreign key (player_uuid)
    references players (uuid)
    ON update cascade
    ON delete RESTRICT,
  CONSTRAINT fk_tournament_registrations_tournament_uuid_fkey
    foreign key (tournament_uuid)
    references tournaments (uuid)
    ON update cascade
    ON delete cascade,
  CONSTRAINT uq_tournament_registrations_unique_player_per_tournament
    unique (player_uuid, tournament_uuid)
) tablespace pg_default;

-- 2. Indexes for faster lookups

-- For querying all registrations of a tournament
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_tournament
  ON public.tournament_registrations (tournament_uuid);

-- For querying all registrations of a player
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_player
  ON public.tournament_registrations (player_uuid);

-- 3. Enable Row-Level Security
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;

-- 4. Trigger for updated_at
CREATE TRIGGER trg_tournament_registrations_updated_at
BEFORE UPDATE ON public.tournament_registrations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

- `tournament_standings`: Stores the results and rankings of tournament participants. Each record:
    - references a tournament and a player;
    - includes standing details such as `rank`, `points`, and any relevant tiebreakers;
    - Reflects the outcome of all rounds within the tournament.

```sql
-- 1. Table definition
CREATE TABLE public.tournament_standings (
  id bigint generated by default as identity not null,
  uuid uuid not null default gen_random_uuid(),

  -- not normalized for faster lookups
  tournament_uuid uuid not null,
  
  registration_uuid uuid not null,
  player_uuid uuid not null,
  
  player_score bigint null,
  player_rank bigint null,
  player_victories bigint null,
  votes_brew_received bigint null,
  votes_play_received bigint null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  CONSTRAINT pk_tournament_standings_pkey primary key (id),
  CONSTRAINT fk_tournament_standings_tournament_uuid_fkey foreign KEY (tournament_uuid)
    references tournaments (uuid)
    ON delete CASCADE,

  CONSTRAINT uq_tournament_standings_unique_registration
    unique (registration_uuid),
  CONSTRAINT fk_tournament_standings_player_uuid_fkey foreign KEY (player_uuid)
    references players (uuid)
    ON delete RESTRICT,
  CONSTRAINT fk_tournament_standings_registration_uuid_fkey foreign KEY (registration_uuid)
    references tournament_registrations (uuid)
    ON delete CASCADE
) tablespace pg_default;

-- 2. Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_tournament_standings_player_uuid
  ON public.tournament_standings (player_uuid);

CREATE INDEX IF NOT EXISTS idx_tournament_standings_tournament_uuid
  ON public.tournament_standings (tournament_uuid);

CREATE INDEX IF NOT EXISTS idx_tournament_standings_registration_uuid
  ON public.tournament_standings (registration_uuid);

-- 3. Trigger for updated_at
CREATE TRIGGER trg_tournament_standings_updated_at
BEFORE UPDATE ON public.tournament_standings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Enable Row-Level Security
ALTER TABLE public.tournament_standings ENABLE ROW LEVEL SECURITY;
```

### 4. Players domain

- `players`: Stores information about individual players. Each player may participate in tournaments, register for events, and have associated decks and preferred formats.

```sql
-- 1. Table definition
CREATE TABLE public.players (
  id         bigint generated by default as identity not null,
  uuid       uuid not null default gen_random_uuid(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- always linked to an associate
  associate_uuid uuid not null,
  -- optional: linked to Supabase Auth only when logging in
  user_id        uuid null,

  -- optional nickname for the player
  nickname   text null,
  -- flag for manual deactivation
  is_banned  boolean not null default false,

  CONSTRAINT pk_players primary key (id),
  CONSTRAINT uq_players_uuid_key unique (uuid),
  CONSTRAINT uq_players_associate_uuid_key unique (associate_uuid),
  CONSTRAINT uq_players_user_id_key unique (user_id),
  CONSTRAINT players_associate_uuid_fkey foreign key (associate_uuid)
    references pauperwave_associates (uuid)
    ON update cascade ON delete restrict,
  CONSTRAINT players_user_id_fkey foreign key (user_id)
    references auth.users (id)
    ON delete set null
) tablespace pg_default;

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_players_associate_uuid
  ON public.players (associate_uuid);
CREATE INDEX IF NOT EXISTS idx_players_user_id
  ON public.players (user_id);

-- 3. Auto-update updated_at
CREATE TRIGGER trg_players_updated_at
BEFORE UPDATE ON public.players
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Row-Level Security
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

```

```sql
-- 5. View con is_active calcolato e dati anagrafici dall'associato
CREATE VIEW public.players_full
WITH (security_invoker = true) -- RLS on underlying tables is enforced per calling user
AS
SELECT
  p.id,
  p.uuid,
  p.user_id,
  p.nickname,
  p.is_banned,
  p.created_at,
  p.associate_uuid,
  a.first_name,
  a.last_name,
  a.email_address,
  a.pauperwave_associate_number,
  EXISTS (
    SELECT 1 FROM public.pauperwave_associate_renewals AS r
    WHERE r.associate_uuid = p.associate_uuid
    AND r.renewal_year = EXTRACT(YEAR FROM CURRENT_DATE)::smallint
  ) AS is_active
FROM public.players p
JOIN public.pauperwave_associates a ON a.uuid = p.associate_uuid;
```

- `player_formats`: Maps players to the Magic formats they play. Each record:
    - references a `player` and a `mtg_format`;
    - indicates which formats a player is active.

```sql
-- 1. Table definition
CREATE TABLE public.player_formats (
  id bigint generated by default as identity not null, -- numeric reference
  
  format_uuid uuid not null,
  player_uuid uuid not null,

  CONSTRAINT pk_players_formats_pkey primary key (id),
  CONSTRAINT uq_unique_player_format unique (player_uuid, format_uuid),
  CONSTRAINT fk_players_formats_player_uuid_fkey foreign KEY (player_uuid)
    references players (uuid)
    ON delete RESTRICT,
  CONSTRAINT fk_players_formats_format_uuid_fkey foreign KEY (format_uuid)
    references mtg_formats (uuid)
    ON update CASCADE
    ON delete RESTRICT
) tablespace pg_default;

-- 2. Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_player_formats_player_uuid
  ON public.player_formats (player_uuid);
CREATE INDEX IF NOT EXISTS idx_player_formats_format_uuid
  ON public.player_formats (format_uuid);

-- 3. Enable Row-Level Security
ALTER TABLE public.player_formats ENABLE ROW LEVEL SECURITY;
```

### 5. Decks domain

- `commander_decks`:

```sql
-- 1. Table definition
CREATE TABLE public.commander_decks (
    id bigint generated by default as identity not null, -- numeric reference
    uuid uuid not null default gen_random_uuid(),
    player_uuid uuid not null,
    combo_name text null,
    deck_archetype_uuid uuid null,
    commander_1_name text not null,
    commander_2_name text null,
    companion_name text null default ''::text,
    decklist_url text null default ''::text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    CONSTRAINT pk_commander_decks PRIMARY KEY (id),
    CONSTRAINT uq_commander_decks_uuid UNIQUE (uuid),
    CONSTRAINT fk_commander_decks_player FOREIGN KEY (player_uuid)
      REFERENCES players(uuid) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_decks_commander_combo_name_fkey foreign key (combo_name)
        references mtg_color_combinations (combo_name)
        ON update cascade ON delete restrict,
    CONSTRAINT fk_decks_commander_archetypes_uuid_fkey foreign key (deck_archetype_uuid)
        references deck_archetypes (uuid)
        ON delete set null
) tablespace pg_default;

-- 2. Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_decks_commander_combo_name
ON public.commander_decks using btree (combo_name) tablespace pg_default;

CREATE INDEX IF NOT EXISTS idx_commander_decks_player_uuid
  ON public.commander_decks (player_uuid);

CREATE INDEX IF NOT EXISTS idx_commander_decks_commanders
  ON public.commander_decks (commander_1_name, commander_2_name);

-- 3. Partial unique indexes for deck uniqueness per player
-- Single commander: unique per player
CREATE UNIQUE INDEX IF NOT EXISTS uq_commander_decks_single
  ON public.commander_decks (player_uuid, commander_1_name)
  WHERE commander_2_name IS NULL;

-- Partner commanders: unique per player
CREATE UNIQUE INDEX IF NOT EXISTS uq_commander_decks_partner
  ON public.commander_decks (player_uuid, commander_1_name, commander_2_name)
  WHERE commander_2_name IS NOT NULL;

-- 4. Trigger for updated_at
CREATE TRIGGER trg_commander_decks_updated_at
BEFORE UPDATE ON public.commander_decks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 5. Enable Row-Level Security
alter table public.commander_decks enable row level security;
```

- `deck_archetypes`:

```sql
CREATE TABLE public.deck_archetypes (
    id bigint generated by default as identity not null, -- numeric reference
    uuid uuid not null default gen_random_uuid(),
    name text not null,
    description text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    CONSTRAINT pk_deck_archetypes_pkey primary key (id),
    CONSTRAINT uq_deck_archetypes_uuid_key unique (uuid),
    CONSTRAINT uq_decks_archetypes_name_key unique (name)
) tablespace pg_default;

-- Enable Row-Level Security
alter table public.deck_archetypes enable row level security;

-- Trigger for updated_at
CREATE TRIGGER trg_deck_archetypes_updated_at
BEFORE UPDATE ON public.deck_archetypes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### Helper Functions

- `find_or_create_commander_deck`: Finds an existing deck by player_uuid and commander names, or creates a new one if it doesn't exist. Decks are now scoped per-player, so the uniqueness check includes player_uuid. This is used when entering tournament results to automatically create decks on-the-fly. Uses INSERT ON CONFLICT with partial unique indexes for atomicity to avoid race conditions.

```sql
CREATE OR REPLACE FUNCTION public.find_or_create_commander_deck(
  p_player_uuid        uuid,
  p_commander_1_name   text,
  p_commander_2_name   text default null
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_deck_uuid uuid;
BEGIN
  -- 1. Upsert the deck atomically with player_uuid
  -- Use appropriate conflict target based on single vs partner commander
  IF p_commander_2_name IS NULL THEN
    INSERT INTO public.commander_decks (player_uuid, commander_1_name, commander_2_name)
    VALUES (p_player_uuid, p_commander_1_name, p_commander_2_name)
    ON CONFLICT (player_uuid, commander_1_name) WHERE commander_2_name IS NULL DO NOTHING
    RETURNING uuid INTO v_deck_uuid;
  ELSE
    INSERT INTO public.commander_decks (player_uuid, commander_1_name, commander_2_name)
    VALUES (p_player_uuid, p_commander_1_name, p_commander_2_name)
    ON CONFLICT (player_uuid, commander_1_name, commander_2_name) WHERE commander_2_name IS NOT NULL DO NOTHING
    RETURNING uuid INTO v_deck_uuid;
  END IF;

  -- 2. If it already existed, ON CONFLICT DO NOTHING returns nothing — fetch it
  IF v_deck_uuid IS NULL THEN
    SELECT uuid INTO v_deck_uuid
    FROM public.commander_decks
    WHERE player_uuid = p_player_uuid
      AND commander_1_name = p_commander_1_name
      AND commander_2_name IS NOT DISTINCT FROM p_commander_2_name;
  END IF;

  RETURN v_deck_uuid;
END;
$$;
```

### 6. MTG reference data

- `mtg_formats`:

```sql
-- 1. Table definition
CREATE TABLE public.mtg_formats (
  id bigint generated by default as identity not null,
  uuid uuid not null default gen_random_uuid(),
  
  name text not null,
  description text null default ''::text,
  website_url text null,

  sanctioned boolean not null,
  category text not null,
  platform text[] null,

  deck_size smallint null,
  is_multiplayer boolean null default false,
  min_players smallint null,
  max_players smallint null,
  game_duration smallint null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  CONSTRAINT pk_mtg_formats_pkey primary key (id),
  CONSTRAINT uq_mtg_formats_name_key unique (name),
  CONSTRAINT uq_mtg_formats_uuid_key unique (uuid)
) tablespace pg_default;

-- 2. Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_mtg_formats_category
  ON public.mtg_formats (category);

CREATE INDEX IF NOT EXISTS idx_mtg_formats_sanctioned
  ON public.mtg_formats (sanctioned);

-- 3. Trigger for updated_at
CREATE TRIGGER trg_mtg_formats_updated_at
BEFORE UPDATE ON public.mtg_formats
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Enable Row-Level Security
ALTER TABLE public.mtg_formats ENABLE ROW LEVEL SECURITY;
```

- `mtg_color_combinations`:

```sql
-- 1. Table definition
CREATE TABLE public.mtg_color_combinations (
  id bigint generated by default as identity not null,
  uuid uuid not null default gen_random_uuid(),
  
  combo_name text not null,
  mana_array text[] not null,
  primary_mechanics text[] null,

  CONSTRAINT pk_mtg_color_combinations_pkey primary key (id),
  CONSTRAINT uq_mtg_color_combinations_combo_name_key unique (combo_name),
  CONSTRAINT uq_mtg_color_combinations_mana_array_key unique (mana_array),
  CONSTRAINT uq_mtg_color_combinations_uuid_key unique (uuid)
) tablespace pg_default;

-- 2. Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_mtg_color_combinations_mana_array
  ON public.mtg_color_combinations using btree (mana_array) tablespace pg_default;

-- 3. Enable Row-Level Security
ALTER TABLE public.mtg_color_combinations ENABLE ROW LEVEL SECURITY;
```

- `mtg_commanders`: Commander-specific reference table for deck building and card search. Synced monthly from Scryfall via Edge Function. Contains pre-computed flags for partner mechanics and other commander-specific attributes.

```sql
-- 1. Table definition
CREATE TABLE public.mtg_commanders (
  id bigint generated by default as identity not null,
  uuid uuid not null default gen_random_uuid(),
  
  -- Scryfall identifiers
  scryfall_id text not null unique,
  scryfall_url text not null,
  
  -- Core fields for search and display
  card_name text not null,
  image_url text null,
  mana_cost text null,
  cmc numeric null,
  color_identity text[] null,
  
  -- Type/keyword info
  type_line text null,
  keywords text[] null,
  oracle_text text null,
  
  -- Partner mechanics (collapsed from 5 boolean flags)
  partner_type text null,
  -- 'partner' | 'partner_with' | 'partner_group' | 'friends_forever' 
  -- | 'doctor' | 'doctors_companion' | 'background_commander' | 'background'
  partner_with_scryfall_id text null,  -- only for 'partner_with' (specific named target)
  partner_group_tag text null,          -- only for 'partner_group' e.g. 'Survivors', 'Father & son'
  
  -- Additional useful fields
  legalities jsonb null,
  released_at date null,
  edhrec_rank int null,
  
  -- Sync tracking
  last_synced_at timestamptz not null default now(),
  
  CONSTRAINT pk_mtg_commanders primary key (id),
  CONSTRAINT uq_mtg_commanders_uuid unique (uuid),
  CONSTRAINT fk_mtg_commanders_partner_with foreign key (partner_with_scryfall_id)
    references mtg_commanders (scryfall_id)
    ON update cascade
    ON delete set null,
  CONSTRAINT ck_mtg_commanders_partner_type check (
    partner_type is null or partner_type = any (array[
      'partner', 'partner_with', 'partner_group', 'friends_forever',
      'doctor', 'doctors_companion', 'background_commander', 'background'
    ])
  )
) tablespace pg_default;

-- 2. Indexes for mtg_commanders
CREATE INDEX IF NOT EXISTS idx_mtg_commanders_scryfall_id
  ON public.mtg_commanders (scryfall_id);

-- Fuzzy search on card name (requires pg_trgm extension)
CREATE INDEX IF NOT EXISTS idx_mtg_commanders_card_name_trgm
  ON public.mtg_commanders
  USING gin (lower(card_name) gin_trgm_ops);

-- GIN index for color identity filtering
CREATE INDEX IF NOT EXISTS idx_mtg_commanders_color_identity
  ON public.mtg_commanders USING gin (color_identity);

-- GIN index for keyword filtering
CREATE INDEX IF NOT EXISTS idx_mtg_commanders_keywords
  ON public.mtg_commanders USING gin (keywords);

-- Partner queries
CREATE INDEX IF NOT EXISTS idx_mtg_commanders_partner_type
  ON public.mtg_commanders (partner_type)
  WHERE partner_type is not null;

CREATE INDEX IF NOT EXISTS idx_mtg_commanders_partner_group_tag
  ON public.mtg_commanders (partner_group_tag)
  WHERE partner_type = 'partner_group';

CREATE INDEX IF NOT EXISTS idx_mtg_commanders_partner_with_scryfall_id
  ON public.mtg_commanders (partner_with_scryfall_id)
  WHERE partner_type = 'partner_with';

-- EDHREC rank for popularity sorting
CREATE INDEX IF NOT EXISTS idx_mtg_commanders_edhrec_rank
  ON public.mtg_commanders (edhrec_rank)
  WHERE edhrec_rank is not null;

-- Release date for analytics
CREATE INDEX IF NOT EXISTS idx_mtg_commanders_released_at
  ON public.mtg_commanders (released_at);

-- 3. Enable Row-Level Security
ALTER TABLE public.mtg_commanders ENABLE ROW LEVEL SECURITY;
```

### 7. Rulesets domain

The dependency graph is:

`ruleset__descriptions` is a global category lookup table (like an enum with metadata). It doesn't belong to a specific ruleset instance — it just defines what categories exist (`kill`, `brew`, `play`, etc.). The relationship lives in ruleset__points, which joins a ruleset to a category with a point value.
```
rulesets ──────────────────────────────┐
                                       ↓
ruleset__descriptions (categories) → ruleset__points
```
`ruleset__points` is the junction — it holds both `ruleset_id` and `category` FKs.

- `rulesets`:

```sql
-- 1. Table definition
CREATE TABLE public.rulesets (
  id bigint generated by default as identity not null,
  uuid uuid not null default gen_random_uuid(),

  label text not null,
  description text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  CONSTRAINT pk_rulesets primary key (id),
  CONSTRAINT uq_rulesets_uuid_key unique (uuid)
) tablespace pg_default;

-- 2. Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_rulesets_label
  ON public.rulesets using btree (label) tablespace pg_default;

-- 3. Trigger for updated_at
CREATE TRIGGER trg_rulesets_updated_at
BEFORE UPDATE ON public.rulesets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Enable Row-Level Security
ALTER TABLE public.rulesets ENABLE ROW LEVEL SECURITY;
```

- `ruleset__descriptions`:

```sql
-- 1. Table definition
CREATE TABLE public.ruleset__descriptions (
  id bigint generated by default as identity not null,
  
  category text not null,
  description text not null,
  
  CONSTRAINT pk_ruleset__descriptions_pkey primary key (id),
  CONSTRAINT uq_ruleset__descriptions_category_key unique (category)
) tablespace pg_default;

-- 2. Indexes for faster lookups

-- 3. Enable Row-Level Security
alter table public.ruleset__descriptions enable row level security;
```

- `ruleset__points`:

```sql
-- 1. Table definition
CREATE TABLE public.ruleset__points (
  id bigint generated by default as identity not null,
  ruleset_uuid uuid not null,
  category text not null,
  points smallint not null,

  CONSTRAINT pk_ruleset__points_pkey primary key (id),
  CONSTRAINT fk_rulesets_points_ruleset_uuid foreign key (ruleset_uuid)
    references rulesets (uuid)
    ON update cascade
    ON delete cascade,
  CONSTRAINT fk_ruleset__points_category_fkey foreign key (category)
    references ruleset__descriptions (category)
    ON update cascade
    ON delete restrict
) tablespace pg_default;

-- 2. Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_rulesets_points_ruleset_uuid
  ON public.ruleset__points (ruleset_uuid);
CREATE INDEX IF NOT EXISTS idx_rulesets_points_category
  ON public.ruleset__points using btree (category) tablespace pg_default;

-- 3. Enable Row-Level Security
alter table public.ruleset__points enable row level security;
```

### 8. Users & roles domain

- `user_roles`:

```sql
-- 1. Table definition
CREATE TABLE public.user_roles (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null,
  updated_by uuid null,
  CONSTRAINT user_roles_pkey primary key (id),
  CONSTRAINT user_roles_user_id_role_key unique (user_id, role),
  CONSTRAINT user_roles_user_id_fkey foreign KEY (user_id) references auth.users (id) ON delete CASCADE,
  CONSTRAINT fk_user_roles_created_by FOREIGN KEY (created_by)
    REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT fk_user_roles_updated_by FOREIGN KEY (updated_by)
    REFERENCES auth.users(id) ON DELETE SET NULL
) tablespace pg_default;

-- 2. Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
  ON public.user_roles using btree (user_id) tablespace pg_default;
CREATE INDEX IF NOT EXISTS idx_user_roles_role
  ON public.user_roles using btree (role) tablespace pg_default;

-- 3. Trigger for updated_at
CREATE TRIGGER trg_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Enable Row-Level Security
alter table public.user_roles enable row level security;
```
