-- Was encoded as text inside `notes` and regex-parsed on every read
-- (parseTransactionNotes.ts) — the receipt number gets a real column instead
-- (user request, 2026-08-25). Verified first: all 697 non-null-notes rows
-- carry the "Importato da foglio storico ricevute 2026" import-provenance
-- marker (this app's whole payment history came from that 2026 import), 502
-- also have "(ricevuta n° X)"; only ids 114/118 have genuine trailing free
-- text (the discount note added in the 2026-08-24 audit) after that marker.
alter table public.pauperwave_payments add column receipt_ref text null;

update public.pauperwave_payments
set receipt_ref = (regexp_match(notes, 'ricevuta n° ([^)]+)\)'))[1]
where notes ~ 'ricevuta n° ';

-- Strips the import-provenance marker (and receipt fragment, now in its own
-- column) out of `notes` itself, trimming the leftover leading separator
-- (space/pipe/em-dash) that preceded it. Left as '', not NULL — `notes` is
-- NOT NULL and the app types it as a plain `string` throughout, so an empty
-- string is "no notes" here, same as it already was pre-import.
update public.pauperwave_payments
set notes = regexp_replace(
  trim(regexp_replace(notes, 'Importato da foglio storico ricevute \d{4}( \(ricevuta n° [^)]+\))?', '', 'g')),
  '^[\s|—]+', ''
)
where notes ~ 'Importato da foglio storico ricevute \d{4}';
