-- supabase\migrations\20260823170000_add_token_purchase_payment_type.sql
-- Adds 'Token Purchase' to ck_payment_type (user request, 2026-08-23):
-- buying tokens to spend inside an event -- Commanderwave Fest's "N gettoni"
-- line items -- is conceptually distinct from an Event Fee (the event entry
-- itself). Also reclassifies the 29 existing historical-import rows whose
-- event_name matches "N gettoni"/"N gettone" (see transactionGettoni.ts),
-- all currently 'Event Fee', to the new type.
alter table public.pauperwave_payments
  drop constraint ck_payment_type;

alter table public.pauperwave_payments
  add constraint ck_payment_type check (
    payment_type = any (
      array[
        'Association Fee'::text,
        'Donation'::text,
        'Event Fee'::text,
        'Tournament Fee'::text,
        'Token Purchase'::text
      ]
    )
  );

update public.pauperwave_payments
set payment_type = 'Token Purchase'
where payment_type = 'Event Fee'
  and event_name ~* '^\d+\s*getton[ei]$';
