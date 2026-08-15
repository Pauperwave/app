-- Aligns tournaments' single ambiguous `datetime` column with the
-- starts_at/ends_at pair events and leagues already use, and restores a real
-- end time (the mock generator computed one from a per-tournament duration —
-- see the removed server/api/tournaments.ts — but the real schema never had
-- anywhere to put it).

alter table public.tournaments rename column datetime to starts_at;
alter table public.tournaments add column ends_at timestamptz;

update public.tournaments set ends_at = starts_at + interval '7 hours'
where name = 'Draft "Lo Hobbit"';
