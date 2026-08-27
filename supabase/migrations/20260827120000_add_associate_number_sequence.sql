-- supabase\migrations\20260827120000_add_associate_number_sequence.sql
-- No mechanism ever assigned pauperwave_associate_number: no trigger, no app
-- code writes it anywhere (confirmed live 2026-08-27 — 248 approved
-- associates, only 167 had a number, non-chronologically, implying manual/
-- sporadic direct-DB assignment). Existing numbers top out at PW-0303, all
-- well-formed. This sequence backs next_pauperwave_associate_number(),
-- called from approve.post.ts on a genuinely new approval only — never from
-- approve-renewal.post.ts, since a renewal keeps the associate's existing
-- number (user request, 2026-08-27). The 81 pre-existing gaps are left
-- alone (user decision) — pauperwave_associate_number is also now editable
-- from the associate edit modal for staff to fix those by hand.
create sequence public.pauperwave_associate_number_seq start with 304;

create function public.next_pauperwave_associate_number()
returns text
language sql
as $$
  select 'PW-' || lpad(nextval('public.pauperwave_associate_number_seq')::text, 4, '0')
$$;
