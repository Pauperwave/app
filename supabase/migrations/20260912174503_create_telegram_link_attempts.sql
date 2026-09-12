-- supabase\migrations\20260912174503_create_telegram_link_attempts.sql
-- Rate-limits linking.ts's own email-based account-linking flow: any
-- plain-text message that looks like an email is checked against
-- pauperwave_associates, so without a limit a chat could brute-force/
-- enumerate member emails by typing many in a row and reading the bot's
-- different responses (not found / already linked elsewhere / success).
-- One row per attempt (not a single counter column) — keeps the "how many
-- in the last N minutes" check a plain range query, no separate
-- reset-the-window logic to get wrong.
create table public.pauperwave_telegram_link_attempts (
  id bigint generated always as identity primary key,
  chat_id bigint not null,
  attempted_at timestamptz not null default now()
);

create index pauperwave_telegram_link_attempts_chat_id_attempted_at_idx
  on public.pauperwave_telegram_link_attempts (chat_id, attempted_at);

-- Scritta/letta solo dal bot (service role, bypassa RLS) — stesso schema di
-- pauperwave_telegram_chat_settings.
alter table public.pauperwave_telegram_link_attempts enable row level security;
