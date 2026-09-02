-- supabase\migrations\20260902110424_resync_payments_id_sequence_to_max.sql
-- pauperwave_payments_id_seq had drifted behind the real max(id) again
-- (last_value 705, max(id) 716) — same drift class as the two prior
-- resequence migrations (20260823150456, 20260823150749). Found while
-- testing payment_renewal_transactional_rpcs: the next insert (via ANY
-- code path, not just the new RPCs) would have collided with an existing
-- row on the primary key.
select setval('public.pauperwave_payments_id_seq', (select max(id) from public.pauperwave_payments));
