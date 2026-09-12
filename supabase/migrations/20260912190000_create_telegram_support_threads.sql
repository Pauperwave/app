-- supabase\migrations\20260912190000_create_telegram_support_threads.sql
-- Lets a super_admin reply to a /supporto forward (Telegram reply-to-message)
-- and have the bot relay that reply back to the member's own chat. Telegram
-- gives no built-in way to reply to a user by @username (only by chat_id,
-- and only a numeric one at that), so this table is the only link between
-- "which forwarded message did this admin reply to" and "which member chat
-- sent the original request". One row per admin per request, since each
-- super_admin's copy of the 🆘 notification has its own message_id in their
-- own chat.
create table public.pauperwave_telegram_support_threads (
  id bigint generated always as identity primary key,
  admin_chat_id bigint not null,
  admin_message_id bigint not null,
  member_chat_id bigint not null,
  created_at timestamptz not null default now()
);

create unique index pauperwave_telegram_support_threads_admin_message_idx
  on public.pauperwave_telegram_support_threads (admin_chat_id, admin_message_id);

-- Scritta/letta solo dal bot (service role, bypassa RLS) — stesso schema di
-- pauperwave_telegram_link_attempts.
alter table public.pauperwave_telegram_support_threads enable row level security;
