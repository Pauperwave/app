# RLS POLICIES

This document defines Row-Level Security policies for all tables in the database. Policies assume the existence of:

- `has_management_permissions(uuid)` function - returns true for users with admin, organizer, or judge roles
- `user_roles` table with roles: `admin`, `organizer`, `judge`

## Policy Patterns

Policies follow consistent patterns based on data sensitivity:

- **Reference/public data** (leagues, mtg_formats, etc.) → `public_read` + `management_full_access`
- **Player-owned data** → `public_read` or no public read + `player_*` scoped policy + `management_full_access`
- **Sensitive data** (pauperwave_associates, pauperwave_payments) → no public read, scoped player read only + `management_full_access`

## File Structure

Structure now mirrors the database schema:

1. **Pauperwave Domain** - `pauperwave_associates`, `pauperwave_associate_renewals`, `pauperwave_payments`, `payment_receipts`
2. **Leagues & Events Domain** - `organizations`, `events`, `event_locations`, `event_attendees`, `leagues`
3. **Tournaments Domain** - `tournaments`, `tournament_registrations`, `tournament_standings`, `tournament_rounds`, `tournament_pairings`, `tournament_round_results`, `tournament_votes`, `tournament_kills`
4. **Players Domain** - `players`, `player_formats`
5. **Decks Domain** - `commander_decks`, `deck_archetypes`
6. **MTG Reference Data Domain** - `mtg_formats`, `mtg_color_combinations`
7. **Rulesets Domain** - rulesets, `ruleset__descriptions`, `ruleset__points`
8. **Users & Roles Domain** - `user_roles`

---

## 1. Pauperwave Domain

### pauperwave_associates

```sql
-- Anyone with management permissions sees all associates
CREATE POLICY management_full_access ON public.pauperwave_associates
FOR ALL
USING (public.has_management_permissions(auth.uid()))
WITH CHECK (public.has_management_permissions(auth.uid()));

-- A player can see their own associate record
CREATE POLICY player_own_associate ON public.pauperwave_associates
FOR SELECT
USING (
  uuid = (
    SELECT associate_uuid FROM public.players
    WHERE user_id = auth.uid()
  )
);

-- Anyone can submit a membership application via the public form.
-- Status is enforced to 'pending' so applicants cannot self-approve.
-- The admin reviews and approves/rejects via the management UI.
CREATE POLICY public_apply ON public.pauperwave_associates
FOR INSERT
WITH CHECK (membership_request_status = 'pending');
```

### pauperwave_associate_renewals

```sql
CREATE POLICY management_full_access ON public.pauperwave_associate_renewals
FOR ALL
USING (public.has_management_permissions(auth.uid()))
WITH CHECK (public.has_management_permissions(auth.uid()));

CREATE POLICY player_own_renewals ON public.pauperwave_associate_renewals
FOR SELECT
USING (
  associate_uuid = (
    SELECT associate_uuid FROM public.players
    WHERE user_id = auth.uid()
  )
);
```

### pauperwave_payments

```sql
-- Only management can see all payments
CREATE POLICY management_full_access ON public.pauperwave_payments
FOR ALL
USING (public.has_management_permissions(auth.uid()))
WITH CHECK (public.has_management_permissions(auth.uid()));

-- A player can see only their own payments
CREATE POLICY player_own_payments ON public.pauperwave_payments
FOR SELECT
USING (
  associate_uuid = (
    SELECT associate_uuid FROM public.players
    WHERE user_id = auth.uid()
  )
);
```

### payment_receipts

```sql
-- Only management can see all receipts
CREATE POLICY management_full_access ON public.payment_receipts
FOR ALL
USING (public.has_management_permissions(auth.uid()))
WITH CHECK (public.has_management_permissions(auth.uid()));

-- A player can see only their own payment receipts
CREATE POLICY player_own_receipts ON public.payment_receipts
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.pauperwave_payments pay
    JOIN public.players pl ON pl.associate_uuid = pay.associate_uuid
    WHERE pay.uuid = payment_uuid
      AND pl.user_id = auth.uid()
  )
);
```

---

## 2. Leagues & Events Domain

### organizations

```sql
-- Public read: anyone can see organizations
CREATE POLICY public_read ON public.organizations
FOR SELECT USING (true);

-- Management: full access
CREATE POLICY management_full_access ON public.organizations
FOR ALL
USING (public.has_management_permissions(auth.uid()))
WITH CHECK (public.has_management_permissions(auth.uid()));
```

### events

```sql
-- Public read: non-deleted events are visible to everyone
CREATE POLICY public_read ON public.events
FOR SELECT USING (deleted_at IS NULL);

-- Management: full access (including soft-deleted records)
CREATE POLICY management_full_access ON public.events
FOR ALL
USING (public.has_management_permissions(auth.uid()))
WITH CHECK (public.has_management_permissions(auth.uid()));
```

### event_locations

```sql
-- Public read: anyone can see event locations
CREATE POLICY public_read ON public.event_locations
FOR SELECT USING (true);

-- Management: full access
CREATE POLICY management_full_access ON public.event_locations
FOR ALL
USING (public.has_management_permissions(auth.uid()))
WITH CHECK (public.has_management_permissions(auth.uid()));
```

### event_attendees

```sql
CREATE POLICY public_read ON public.event_attendees
FOR SELECT USING (true);

CREATE POLICY player_register_self ON public.event_attendees
FOR INSERT
WITH CHECK (
  player_uuid = (
    SELECT uuid FROM public.players WHERE user_id = auth.uid()
  )
);

CREATE POLICY player_delete_own ON public.event_attendees
FOR DELETE
USING (
  player_uuid = (
    SELECT uuid FROM public.players WHERE user_id = auth.uid()
  )
);

CREATE POLICY management_full_access ON public.event_attendees
FOR ALL
USING (public.has_management_permissions(auth.uid()))
WITH CHECK (public.has_management_permissions(auth.uid()));
```

### leagues

```sql
-- Public read: non-deleted leagues are visible to everyone
CREATE POLICY public_read ON public.leagues
FOR SELECT USING (deleted_at IS NULL);

-- Management: full access (including soft-deleted records)
CREATE POLICY management_full_access ON public.leagues
FOR ALL
USING (public.has_management_permissions(auth.uid()))
WITH CHECK (public.has_management_permissions(auth.uid()));
```

---

## 3. Tournaments Domain

### tournaments

```sql
-- Public: non-deleted tournaments are visible to everyone
CREATE POLICY public_read ON public.tournaments
FOR SELECT USING (deleted_at IS NULL);

-- Management: full access (including soft-deleted records)
CREATE POLICY management_full_access ON public.tournaments
FOR ALL
USING (public.has_management_permissions(auth.uid()))
WITH CHECK (public.has_management_permissions(auth.uid()));
```

### tournament_registrations

```sql
-- Players can see all registrations (for a tournament's participant list)
CREATE POLICY public_read ON public.tournament_registrations
FOR SELECT USING (true);

-- Players can register/unregister themselves only
CREATE POLICY player_own_registration ON public.tournament_registrations
FOR INSERT
WITH CHECK (
  player_uuid = (
    SELECT uuid FROM public.players WHERE user_id = auth.uid()
  )
);

CREATE POLICY player_delete_own ON public.tournament_registrations
FOR DELETE
USING (
  player_uuid = (
    SELECT uuid FROM public.players WHERE user_id = auth.uid()
  )
);

-- Management: full access (approve, remove, etc.)
CREATE POLICY management_full_access ON public.tournament_registrations
FOR ALL
USING (public.has_management_permissions(auth.uid()))
WITH CHECK (public.has_management_permissions(auth.uid()));
```

### tournament_standings

```sql
-- Public read: standings are meant to be visible
CREATE POLICY public_read ON public.tournament_standings
FOR SELECT USING (true);

-- Management writes
CREATE POLICY management_full_access ON public.tournament_standings
FOR ALL
USING (public.has_management_permissions(auth.uid()))
WITH CHECK (public.has_management_permissions(auth.uid()));
```

### tournament_rounds

```sql
-- Public read: anyone can see tournament rounds
CREATE POLICY public_read ON public.tournament_rounds
FOR SELECT USING (true);

-- Management: full access
CREATE POLICY management_full_access ON public.tournament_rounds
FOR ALL
USING (public.has_management_permissions(auth.uid()))
WITH CHECK (public.has_management_permissions(auth.uid()));
```

### tournament_pairings

```sql
-- Public read: anyone can see tournament pairings
CREATE POLICY public_read ON public.tournament_pairings
FOR SELECT USING (true);

-- Management: full access
CREATE POLICY management_full_access ON public.tournament_pairings
FOR ALL
USING (public.has_management_permissions(auth.uid()))
WITH CHECK (public.has_management_permissions(auth.uid()));
```

### tournament_round_results

```sql
-- Public read: anyone can see tournament round results
CREATE POLICY public_read ON public.tournament_round_results
FOR SELECT USING (true);

-- Players can enter their own result in pairings they're participating in
CREATE POLICY player_enter_own_result ON public.tournament_round_results
FOR INSERT
WITH CHECK (
  player_uuid = (SELECT uuid FROM public.players WHERE user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.tournament_pairings p
    WHERE p.uuid = pairing_uuid
      AND (
        p.player1_uuid = player_uuid OR p.player2_uuid = player_uuid
        OR p.player3_uuid = player_uuid OR p.player4_uuid = player_uuid
      )
  )
);

-- Management: full access
CREATE POLICY management_full_access ON public.tournament_round_results
FOR ALL
USING (public.has_management_permissions(auth.uid()))
WITH CHECK (public.has_management_permissions(auth.uid()));
```

### tournament_votes

```sql
-- Public read: anyone can see tournament votes
CREATE POLICY public_read ON public.tournament_votes
FOR SELECT USING (true);

-- Players can vote only within their own pairing, and only for other players in that pairing
CREATE POLICY player_vote_in_own_pairing ON public.tournament_votes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournament_pairings p
    WHERE p.uuid = pairing_uuid
      AND (
        p.player1_uuid = (SELECT uuid FROM public.players WHERE user_id = auth.uid())
        OR p.player2_uuid = (SELECT uuid FROM public.players WHERE user_id = auth.uid())
        OR p.player3_uuid = (SELECT uuid FROM public.players WHERE user_id = auth.uid())
        OR p.player4_uuid = (SELECT uuid FROM public.players WHERE user_id = auth.uid())
      )
      AND voted_player_uuid IN (p.player1_uuid, p.player2_uuid, p.player3_uuid, p.player4_uuid)
      AND voted_player_uuid != (SELECT uuid FROM public.players WHERE user_id = auth.uid())
  )
);

-- Management: full access
CREATE POLICY management_full_access ON public.tournament_votes
FOR ALL
USING (public.has_management_permissions(auth.uid()))
WITH CHECK (public.has_management_permissions(auth.uid()));
```

### tournament_kills

```sql
-- Public read: anyone can see tournament kills
CREATE POLICY public_read ON public.tournament_kills
FOR SELECT USING (true);

-- Players can record kills in pairings they're participating in
CREATE POLICY player_record_kill_in_own_pairing ON public.tournament_kills
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournament_pairings p
    WHERE p.uuid = pairing_uuid
      AND (
        p.player1_uuid = (SELECT uuid FROM public.players WHERE user_id = auth.uid())
        OR p.player2_uuid = (SELECT uuid FROM public.players WHERE user_id = auth.uid())
        OR p.player3_uuid = (SELECT uuid FROM public.players WHERE user_id = auth.uid())
        OR p.player4_uuid = (SELECT uuid FROM public.players WHERE user_id = auth.uid())
      )
  )
);

-- Management: full access
CREATE POLICY management_full_access ON public.tournament_kills
FOR ALL
USING (public.has_management_permissions(auth.uid()))
WITH CHECK (public.has_management_permissions(auth.uid()));
```

---

## 4. Players Domain

### players

```sql
CREATE POLICY public_read ON public.players
FOR SELECT USING (true);

CREATE POLICY player_update_self ON public.players
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY management_full_access ON public.players
FOR ALL
USING (public.has_management_permissions(auth.uid()))
WITH CHECK (public.has_management_permissions(auth.uid()));
```

### player_formats

```sql
CREATE POLICY public_read ON public.player_formats
FOR SELECT USING (true);

CREATE POLICY player_manage_own ON public.player_formats
FOR ALL
USING (
  player_uuid = (
    SELECT uuid FROM public.players WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  player_uuid = (
    SELECT uuid FROM public.players WHERE user_id = auth.uid()
  )
);

CREATE POLICY management_full_access ON public.player_formats
FOR ALL
USING (public.has_management_permissions(auth.uid()))
WITH CHECK (public.has_management_permissions(auth.uid()));
```

### players_full (view)

The `players_full` view is defined with `WITH (security_invoker = true)`, which means Postgres enforces RLS on the underlying tables (`players` and `pauperwave_associates`) using the **calling user's** permissions — not the view owner's.

| Caller | What they see |
|--------|---------------|
| Management (admin/organizer/judge) | All rows — `management_full_access` grants access to both underlying tables |
| Authenticated player | Only their own row — the join on `pauperwave_associates` is filtered by `player_own_associate` |
| Unauthenticated / anon | Nothing — `pauperwave_associates` has no public read policy |

No additional policy needs to be created on the view itself. The underlying table policies are the single source of truth.

---

## 5. Decks Domain

### commander_decks

```sql
-- Public read: anyone can see commander decks
CREATE POLICY public_read ON public.commander_decks
FOR SELECT USING (true);

-- Players can manage their own decks
CREATE POLICY player_manage_own_decks ON public.commander_decks
FOR ALL
USING (player_uuid = (SELECT uuid FROM public.players WHERE user_id = auth.uid()))
WITH CHECK (player_uuid = (SELECT uuid FROM public.players WHERE user_id = auth.uid()));

-- Management: full access
CREATE POLICY management_full_access ON public.commander_decks
FOR ALL
USING (public.has_management_permissions(auth.uid()))
WITH CHECK (public.has_management_permissions(auth.uid()));
```

### deck_archetypes

```sql
-- Public read: anyone can see deck archetypes
CREATE POLICY public_read ON public.deck_archetypes
FOR SELECT USING (true);

-- Management: full access
CREATE POLICY management_full_access ON public.deck_archetypes
FOR ALL
USING (public.has_management_permissions(auth.uid()))
WITH CHECK (public.has_management_permissions(auth.uid()));
```

---

## 6. MTG Reference Data Domain

### mtg_formats

```sql
-- Public read: anyone can see MTG formats
CREATE POLICY public_read ON public.mtg_formats
FOR SELECT USING (true);

-- Management: full access
CREATE POLICY management_full_access ON public.mtg_formats
FOR ALL
USING (public.has_management_permissions(auth.uid()))
WITH CHECK (public.has_management_permissions(auth.uid()));
```

### mtg_color_combinations

```sql
-- Public read: anyone can see MTG color combinations
CREATE POLICY public_read ON public.mtg_color_combinations
FOR SELECT USING (true);

-- Management: full access
CREATE POLICY management_full_access ON public.mtg_color_combinations
FOR ALL
USING (public.has_management_permissions(auth.uid()))
WITH CHECK (public.has_management_permissions(auth.uid()));
```

---

## 7. Rulesets Domain

### rulesets

```sql
-- Public read: anyone can see rulesets
CREATE POLICY public_read ON public.rulesets
FOR SELECT USING (true);

-- Management: full access
CREATE POLICY management_full_access ON public.rulesets
FOR ALL
USING (public.has_management_permissions(auth.uid()))
WITH CHECK (public.has_management_permissions(auth.uid()));
```

### ruleset__descriptions

```sql
-- Public read: anyone can see ruleset descriptions
CREATE POLICY public_read ON public.ruleset__descriptions
FOR SELECT USING (true);

-- Management: full access
CREATE POLICY management_full_access ON public.ruleset__descriptions
FOR ALL
USING (public.has_management_permissions(auth.uid()))
WITH CHECK (public.has_management_permissions(auth.uid()));
```

### ruleset__points

```sql
-- Public read: anyone can see ruleset points
CREATE POLICY public_read ON public.ruleset__points
FOR SELECT USING (true);

-- Management: full access
CREATE POLICY management_full_access ON public.ruleset__points
FOR ALL
USING (public.has_management_permissions(auth.uid()))
WITH CHECK (public.has_management_permissions(auth.uid()));
```

---

## 8. Users & Roles Domain

### user_roles

```sql
-- Only admins can manage roles
CREATE POLICY admin_full_access ON public.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Users can read their own roles (e.g. to know what UI to show)
CREATE POLICY user_read_own_roles ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());
```
