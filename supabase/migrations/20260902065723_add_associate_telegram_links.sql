-- supabase\migrations\20260902120000_add_associate_telegram_links.sql
-- Bridges a Telegram chat to a socio, so the bot (server/utils/telegram/)
-- can resolve "who is writing" and, for admin alerts, "who is admin/
-- super_admin and has a linked chat" without any hardcoded chat id in an
-- env var (docs/architecture/telegram-bot.md, decision 2026-09-02). One
-- associate has at most one linked chat and vice versa — re-linking
-- replaces the row rather than accumulating duplicates.
create table public.pauperwave_associate_telegram_links (
  id bigint generated always as identity primary key,
  associate_uuid uuid not null unique references public.pauperwave_associates(uuid) on delete cascade,
  chat_id bigint not null unique,
  linked_at timestamptz not null default now()
);

-- Scritta/letta solo dal bot (service role, bypassa RLS) — nessuna policy
-- client perché nulla la legge direttamente dal browser, stesso schema di
-- pauperwave_cardtrader_expansions/blueprints.
alter table public.pauperwave_associate_telegram_links enable row level security;
