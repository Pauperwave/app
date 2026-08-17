# Useful SQL Queries

Reference for common database operations. Each query is shown in both raw SQL and Nuxt `@nuxtjs/supabase` client code.

> **Soft-delete note**: Queries on `leagues`, `events`, and `tournaments` always include `deleted_at IS NULL` to exclude soft-deleted records. Remove this filter when explicitly querying archived data.

---

## 1. Players

### Get all players with associate info

```sql
SELECT * FROM public.players_full
ORDER BY last_name, first_name;
```

```ts
const client = useSupabaseClient()
const { data, error } = await client
  .from('players_full')
  .select('*')
  .order('last_name').order('first_name')
```

---

### Get active players this year (renewed membership)

```sql
SELECT * FROM public.players_full
WHERE is_active = true
ORDER BY last_name, first_name;
```

```ts
const { data, error } = await client
  .from('players_full')
  .select('*')
  .eq('is_active', true)
  .order('last_name').order('first_name')
```

---

### Get player by UUID

```sql
SELECT * FROM public.players_full
WHERE uuid = $1;
```

```ts
const { data, error } = await client
  .from('players_full')
  .select('*')
  .eq('uuid', playerUuid)
  .single()
```

---

### Get the logged-in user's player profile

```sql
SELECT * FROM public.players_full
WHERE user_id = auth.uid();
```

```ts
const user = useSupabaseUser()
const { data, error } = await client
  .from('players_full')
  .select('*')
  .eq('user_id', user.value!.id)
  .single()
```

---

## 2. Pauperwave Associates

### Get all associates

```sql
SELECT * FROM public.pauperwave_associates
ORDER BY last_name, first_name;
```

```ts
const { data, error } = await client
  .from('pauperwave_associates')
  .select('*')
  .order('last_name').order('first_name')
```

---

### Get associate by UUID

```sql
SELECT * FROM public.pauperwave_associates
WHERE uuid = $1;
```

```ts
const { data, error } = await client
  .from('pauperwave_associates')
  .select('*')
  .eq('uuid', associateUuid)
  .single()
```

---

### Fuzzy search associates by name (SQL only — uses pg_trgm)

```sql
WITH params AS (
  SELECT
    lower(unaccent($1)) AS s_surname,
    lower(unaccent($2)) AS s_name
)
SELECT a.*,
  similarity(lower(unaccent(coalesce(a.last_name,''))), p.s_surname) AS surname_score,
  similarity(lower(unaccent(coalesce(a.first_name,''))), p.s_name)   AS name_score
FROM public.pauperwave_associates a, params p
WHERE (lower(unaccent(coalesce(a.last_name,''))) % p.s_surname)
   OR (lower(unaccent(coalesce(a.first_name,''))) % p.s_name)
ORDER BY surname_score DESC, name_score DESC
LIMIT 10;
```

> Use `supabase.rpc('search_associates', { p_surname, p_name })` if you wrap this in a SQL function.

---

### Get renewal history for an associate

```sql
SELECT * FROM public.pauperwave_associate_renewals
WHERE associate_uuid = $1
ORDER BY renewal_year DESC;
```

```ts
const { data, error } = await client
  .from('pauperwave_associate_renewals')
  .select('*')
  .eq('associate_uuid', associateUuid)
  .order('renewal_year', { ascending: false })
```

---

### Check if associate renewed this year

```sql
SELECT EXISTS (
  SELECT 1 FROM public.pauperwave_associate_renewals
  WHERE associate_uuid = $1
    AND renewal_year = EXTRACT(YEAR FROM CURRENT_DATE)
) AS renewed_this_year;
```

```ts
const currentYear = new Date().getFullYear()
const { data, error } = await client
  .from('pauperwave_associate_renewals')
  .select('id')
  .eq('associate_uuid', associateUuid)
  .eq('renewal_year', currentYear)
  .maybeSingle()

const renewedThisYear = data !== null
```

---

## 3. Payments

### Get all payments for an associate

```sql
SELECT p.*
FROM public.pauperwave_payments p
WHERE p.associate_uuid = $1
ORDER BY p.payment_date DESC;
```

```ts
const { data, error } = await client
  .from('pauperwave_payments')
  .select('*')
  .eq('associate_uuid', associateUuid)
  .order('payment_date', { ascending: false })
```

---

### Get payment with its receipts

```sql
SELECT
  p.*,
  r.uuid AS receipt_uuid,
  r.status AS receipt_status,
  r.sent_at,
  r.pdf_url
FROM public.pauperwave_payments p
LEFT JOIN public.payment_receipts r ON r.payment_uuid = p.uuid
WHERE p.uuid = $1;
```

```ts
const { data, error } = await client
  .from('pauperwave_payments')
  .select('*, payment_receipts(*)')
  .eq('uuid', paymentUuid)
  .single()
```

---

### Monthly payment summary

```sql
SELECT
  DATE_TRUNC('month', payment_date) AS month,
  payment_type,
  payment_method,
  COUNT(*) AS count,
  SUM(payment_amount) AS total
FROM public.pauperwave_payments
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 2;
```

> No direct Supabase client equivalent — use `supabase.rpc()` or query via a Postgres view.

---

## 4. Leagues

### Get all active (non-deleted) leagues

```sql
SELECT * FROM public.leagues
WHERE deleted_at IS NULL
ORDER BY created_at DESC;
```

```ts
const { data, error } = await client
  .from('leagues')
  .select('*')
  .is('deleted_at', null)
  .order('created_at', { ascending: false })
```

---

### Get league by UUID

```sql
SELECT * FROM public.leagues
WHERE uuid = $1 AND deleted_at IS NULL;
```

```ts
const { data, error } = await client
  .from('leagues')
  .select('*')
  .eq('uuid', leagueUuid)
  .is('deleted_at', null)
  .single()
```

---

### Soft-delete a league

```sql
UPDATE public.leagues
SET deleted_at = now()
WHERE uuid = $1;
```

```ts
const { error } = await client
  .from('leagues')
  .update({ deleted_at: new Date().toISOString() })
  .eq('uuid', leagueUuid)
```

---

## 5. Events

### Get event with location and organizer

```sql
SELECT
  e.*,
  l.name AS location_name,
  l.address AS location_address,
  l.city AS location_city,
  o.name AS organizer_name
FROM public.events e
LEFT JOIN public.event_locations l ON l.uuid = e.location_uuid
JOIN public.organizations o ON o.uuid = e.organizer_uuid
WHERE e.uuid = $1
  AND e.deleted_at IS NULL;
```

```ts
const { data, error } = await client
  .from('events')
  .select('*, event_locations(*), organizations(*)')
  .eq('uuid', eventUuid)
  .is('deleted_at', null)
  .single()
```

---

### Get attendees for an event

```sql
SELECT ea.*, p.nickname, a.first_name, a.last_name
FROM public.event_attendees ea
JOIN public.players p ON p.uuid = ea.player_uuid
JOIN public.pauperwave_associates a ON a.uuid = p.associate_uuid
WHERE ea.event_uuid = $1
ORDER BY a.last_name, a.first_name;
```

```ts
const { data, error } = await client
  .from('event_attendees')
  .select('*, players(nickname, pauperwave_associates(first_name, last_name))')
  .eq('event_uuid', eventUuid)
```

---

### Check if player is attending an event

```sql
SELECT EXISTS (
  SELECT 1 FROM public.event_attendees
  WHERE event_uuid = $1 AND player_uuid = $2
) AS is_attending;
```

```ts
const { data } = await client
  .from('event_attendees')
  .select('id')
  .eq('event_uuid', eventUuid)
  .eq('player_uuid', playerUuid)
  .maybeSingle()

const isAttending = data !== null
```

---

## 6. Tournaments

### Get tournaments for an event

```sql
SELECT * FROM public.tournaments
WHERE event_uuid = $1
  AND deleted_at IS NULL
ORDER BY datetime ASC;
```

```ts
const { data, error } = await client
  .from('tournaments')
  .select('*')
  .eq('event_uuid', eventUuid)
  .is('deleted_at', null)
  .order('datetime')
```

---

### Get tournaments for a league

```sql
SELECT * FROM public.tournaments
WHERE league_uuid = $1
  AND deleted_at IS NULL
ORDER BY datetime ASC;
```

```ts
const { data, error } = await client
  .from('tournaments')
  .select('*')
  .eq('league_uuid', leagueUuid)
  .is('deleted_at', null)
  .order('datetime')
```

---

### Get tournament by UUID (with format info)

```sql
SELECT t.*, f.name AS format_name
FROM public.tournaments t
JOIN public.mtg_formats f ON f.uuid = t.format_uuid
WHERE t.uuid = $1
  AND t.deleted_at IS NULL;
```

```ts
const { data, error } = await client
  .from('tournaments')
  .select('*, mtg_formats(name)')
  .eq('uuid', tournamentUuid)
  .is('deleted_at', null)
  .single()
```

---

## 7. Tournament Registrations

### Get all registrations for a tournament

```sql
SELECT tr.*, p.nickname, a.first_name, a.last_name
FROM public.tournament_registrations tr
JOIN public.players p ON p.uuid = tr.player_uuid
JOIN public.pauperwave_associates a ON a.uuid = p.associate_uuid
WHERE tr.tournament_uuid = $1
ORDER BY a.last_name, a.first_name;
```

```ts
const { data, error } = await client
  .from('tournament_registrations')
  .select('*, players(nickname, pauperwave_associates(first_name, last_name))')
  .eq('tournament_uuid', tournamentUuid)
```

---

### Check if a player is registered for a tournament

```sql
SELECT EXISTS (
  SELECT 1 FROM public.tournament_registrations
  WHERE tournament_uuid = $1
    AND player_uuid = $2
) AS is_registered;
```

```ts
const { data } = await client
  .from('tournament_registrations')
  .select('uuid')
  .eq('tournament_uuid', tournamentUuid)
  .eq('player_uuid', playerUuid)
  .maybeSingle()

const isRegistered = data !== null
```

---

## 8. Tournament Standings

### Get standings for a tournament (with player names)

```sql
SELECT
  ts.player_rank,
  ts.player_score,
  ts.player_victories,
  ts.votes_brew_received,
  ts.votes_play_received,
  p.nickname,
  a.first_name,
  a.last_name
FROM public.tournament_standings ts
JOIN public.players p ON p.uuid = ts.player_uuid
JOIN public.pauperwave_associates a ON a.uuid = p.associate_uuid
WHERE ts.tournament_uuid = $1
ORDER BY ts.player_rank ASC;
```

```ts
const { data, error } = await client
  .from('tournament_standings')
  .select('*, players(nickname, pauperwave_associates(first_name, last_name))')
  .eq('tournament_uuid', tournamentUuid)
  .order('player_rank')
```

---

## 9. Tournament Rounds

### Get all rounds for a tournament

```sql
SELECT * FROM public.tournament_rounds
WHERE tournament_uuid = $1
ORDER BY round_number ASC;
```

```ts
const { data, error } = await client
  .from('tournament_rounds')
  .select('*')
  .eq('tournament_uuid', tournamentUuid)
  .order('round_number')
```

---

### Get the current active round

```sql
SELECT * FROM public.tournament_rounds
WHERE tournament_uuid = $1
  AND status IN ('preview', 'approved', 'in_progress')
ORDER BY round_number DESC
LIMIT 1;
```

```ts
const { data, error } = await client
  .from('tournament_rounds')
  .select('*')
  .eq('tournament_uuid', tournamentUuid)
  .in('status', ['preview', 'approved', 'in_progress'])
  .order('round_number', { ascending: false })
  .limit(1)
  .maybeSingle()
```

---

## 10. Tournament Pairings

### Get all pairings for a round

```sql
SELECT * FROM public.tournament_pairings
WHERE round_uuid = $1
ORDER BY table_number ASC;
```

```ts
const { data, error } = await client
  .from('tournament_pairings')
  .select('*')
  .eq('round_uuid', roundUuid)
  .order('table_number')
```

---

### Get a player's pairing in a round

```sql
SELECT * FROM public.tournament_pairings
WHERE round_uuid = $1
  AND (
    player1_uuid = $2
    OR player2_uuid = $2
    OR player3_uuid = $2
    OR player4_uuid = $2
  )
LIMIT 1;
```

```ts
const { data, error } = await client
  .from('tournament_pairings')
  .select('*')
  .eq('round_uuid', roundUuid)
  .or(`player1_uuid.eq.${playerUuid},player2_uuid.eq.${playerUuid},player3_uuid.eq.${playerUuid},player4_uuid.eq.${playerUuid}`)
  .maybeSingle()
```

---

## 11. Tournament Results

### Get results for a pairing

```sql
SELECT
  trr.*,
  p.nickname,
  a.first_name,
  a.last_name,
  cd.commander_1_name,
  cd.commander_2_name
FROM public.tournament_round_results trr
JOIN public.players p ON p.uuid = trr.player_uuid
JOIN public.pauperwave_associates a ON a.uuid = p.associate_uuid
LEFT JOIN public.commander_decks cd ON cd.uuid = trr.commander_deck_uuid
WHERE trr.pairing_uuid = $1
ORDER BY trr.position ASC NULLS LAST;
```

```ts
const { data, error } = await client
  .from('tournament_round_results')
  .select('*, players(nickname, pauperwave_associates(first_name, last_name)), commander_decks(commander_1_name, commander_2_name)')
  .eq('pairing_uuid', pairingUuid)
  .order('position')
```

---

### Get all results for a tournament

```sql
SELECT * FROM public.tournament_round_results
WHERE tournament_uuid = $1;
```

```ts
const { data, error } = await client
  .from('tournament_round_results')
  .select('*')
  .eq('tournament_uuid', tournamentUuid)
```

---

## 12. Tournament Votes

### Get votes cast by a player in a pairing

```sql
SELECT * FROM public.tournament_votes
WHERE pairing_uuid = $1
  AND voter_uuid = $2;
```

```ts
const { data, error } = await client
  .from('tournament_votes')
  .select('*')
  .eq('pairing_uuid', pairingUuid)
  .eq('voter_uuid', playerUuid)
```

---

### Get all votes in a tournament

```sql
SELECT * FROM public.tournament_votes
WHERE tournament_uuid = $1;
```

```ts
const { data, error } = await client
  .from('tournament_votes')
  .select('*')
  .eq('tournament_uuid', tournamentUuid)
```

---

## 13. Tournament Kills

### Get kills in a pairing

```sql
SELECT * FROM public.tournament_kills
WHERE pairing_uuid = $1;
```

```ts
const { data, error } = await client
  .from('tournament_kills')
  .select('*')
  .eq('pairing_uuid', pairingUuid)
```

---

### Get all kills in a tournament

```sql
SELECT * FROM public.tournament_kills
WHERE tournament_uuid = $1;
```

```ts
const { data, error } = await client
  .from('tournament_kills')
  .select('*')
  .eq('tournament_uuid', tournamentUuid)
```

---

### Kill counts per player in a pairing (summary view)

```sql
SELECT * FROM public.tournament_kills_summary
WHERE pairing_uuid = $1;
```

```ts
const { data, error } = await client
  .from('tournament_kills_summary')
  .select('*')
  .eq('pairing_uuid', pairingUuid)
```