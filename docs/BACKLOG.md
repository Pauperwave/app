# Backlog

Committed, ranked work items. P1 = urgent/blocking, P2 = important, P3 = nice to have.

## P1

- **Drop overly-permissive RLS policy on `pauperwave_associates`.** The policy `"Only auth users can do things"` (`FOR ALL`, role `authenticated`, `USING (true)`, no `WITH CHECK`) grants any logged-in user full SELECT/INSERT/UPDATE/DELETE on every associate row — tax codes, birth dates, home addresses — and overrides the narrower `player_own_associate` and `management_full_access` policies, since Postgres RLS policies are OR'd together. Fix: `DROP POLICY "Only auth users can do things" ON public.pauperwave_associates;` then verify access still works as expected for management and self-service applicant flows.
  - Found: 2026-08-05, via manual RLS policy review.
  - Follow-up: audit other tables (`players`, transactions, tournaments, etc.) for the same catch-all-policy pattern before considering this closed.

## P2

- **Migrate magic-link auth from implicit flow to PKCE.** Current flow (`app/pages/auth/callback.vue`, `app/pages/login.vue`) relies on the implicit flow — the session token can briefly appear in the URL fragment/browser history. Given the app handles real associate PII, PKCE (customize email template with `{{ .TokenHash }}`, exchange via `verifyOtp({ token_hash, type: 'email' })` in the callback) is a worthwhile hardening step, though it requires callback-page and Supabase email-template changes.
