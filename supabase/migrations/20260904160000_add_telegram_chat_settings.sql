-- supabase\migrations\20260904160000_add_telegram_chat_settings.sql
-- Per-chat bot preferences, keyed by chat_id alone (not associate_uuid —
-- unlike pauperwave_associate_telegram_links, these apply to any chat that
-- has talked to the bot, linked or not; /calendario's own tornei list is
-- public). First use: hide shop-organized tournaments (Magman etc., status
-- 'external', see 20260904130000_add_external_tournament_status.sql) from
-- /calendario by default, toggled via /visibilita (docs/architecture/telegram-bot.md).
create table public.pauperwave_telegram_chat_settings (
  chat_id bigint primary key,
  show_external_tournaments boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Scritta/letta solo dal bot (service role, bypassa RLS) — nessuna policy
-- client perché nulla la legge direttamente dal browser, stesso schema di
-- pauperwave_associate_telegram_links.
alter table public.pauperwave_telegram_chat_settings enable row level security;
