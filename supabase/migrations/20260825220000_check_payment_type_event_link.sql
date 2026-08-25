-- Ties payment_type to tournament_uuid/event_uuid (user request, 2026-08-25,
-- while investigating why associate/[slug].vue's transactions table still
-- showed raw historical import strings like "PAUPER TAPPA 6" instead of a
-- resolved tournament link). Verified against live data first: across all
-- 697 non-deleted rows (no soft-deleted rows exist at all), the pattern is
-- 100% consistent —
--   Tournament Fee  -> tournament_uuid set, event_uuid null   (449/449)
--   Event Fee       -> event_uuid set, tournament_uuid null    (38/38)
--   Token Purchase  -> event_uuid set, tournament_uuid null    (29/29, the
--     2026 Commanderwave Fest gettoni rows — see transactionGettoni.ts)
--   Association Fee -> neither                                (179/179)
--   Donation        -> neither                                  (2/2)
-- so this was safe to enforce as a real constraint, not just a convention.
alter table public.pauperwave_payments
  add constraint ck_payment_type_event_link
  check (
    (payment_type = 'Tournament Fee' and tournament_uuid is not null and event_uuid is null)
    or (payment_type in ('Event Fee', 'Token Purchase')
        and event_uuid is not null and tournament_uuid is null)
    or (payment_type in ('Association Fee', 'Donation')
        and tournament_uuid is null and event_uuid is null)
  );
