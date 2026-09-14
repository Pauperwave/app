-- Seeds the single ruleset that exists in `league`'s own database
-- (Commander_League project, `rulesets` table, id 1, name "Base") — user
-- request, 2026-09-15: copy the values as-is, no redesign, while porting
-- the Commander tournament flow. `league`'s flat rule_set_rank1..4/kill/
-- brew/play/partecipation columns become rows here, keyed by category
-- (app's normalized ruleset__points/ruleset__descriptions model).
--
-- Same "guard each insert with NOT EXISTS" idempotency convention as
-- 20260816170000_seed_mtg_formats.sql — rulesets.name and
-- ruleset__descriptions.category both have a unique constraint to check
-- against; ruleset__points has none, so it's guarded on the
-- (ruleset_uuid, category) pair instead.

insert into public.ruleset__descriptions (category, description)
select category, description from (values
  ('rank1', 'Punti per il 1° posto al tavolo'),
  ('rank2', 'Punti per il 2° posto al tavolo'),
  ('rank3', 'Punti per il 3° posto al tavolo'),
  ('rank4', 'Punti per il 4° posto al tavolo'),
  ('kill', 'Punti per ogni eliminazione (kill)'),
  ('brew', 'Punti per ogni voto "miglior mazzo" ricevuto'),
  ('play', 'Punti per ogni voto "miglior giocata" ricevuto'),
  ('participation', 'Punti di partecipazione per aver giocato il round')
) as v(category, description)
where not exists (
  select 1 from public.ruleset__descriptions where ruleset__descriptions.category = v.category
);

insert into public.rulesets (name, is_default)
select 'Base', true
where not exists (
  select 1 from public.rulesets where rulesets.name = 'Base'
);

insert into public.ruleset__points (ruleset_uuid, category, points)
select r.uuid, v.category, v.points
from public.rulesets r
cross join (values
  ('rank1', 8),
  ('rank2', 6),
  ('rank3', 4),
  ('rank4', 2),
  ('kill', 1),
  ('brew', 2),
  ('play', 1),
  ('participation', 1)
) as v(category, points)
where r.name = 'Base'
  and not exists (
    select 1 from public.ruleset__points rp
    where rp.ruleset_uuid = r.uuid and rp.category = v.category
  );
