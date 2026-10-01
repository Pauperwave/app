-- supabase\migrations\20261001120000_add_telegram_link_username.sql
-- The Telegram @username of a linked associate, so organizers can open their Telegram profile
-- (t.me/<username>) from the associate tag (user request, 2026-10-01). Filled when the chat is
-- linked and refreshed whenever the bot looks it up (tournamentNotifications/usernames.ts).
alter table public.pauperwave_associate_telegram_links
  add column telegram_username text;

-- Until now only the bot (service role) touched this table. Staff may now read the username, and
-- nothing else: the chat id stays out of reach of the browser (column-level grant + RLS).
create policy "Management can read telegram usernames"
  on public.pauperwave_associate_telegram_links
  for select
  to authenticated
  using (has_management_permissions((select auth.uid())));

revoke all on table public.pauperwave_associate_telegram_links from anon, authenticated;
grant select (associate_uuid, telegram_username)
  on table public.pauperwave_associate_telegram_links to authenticated;
