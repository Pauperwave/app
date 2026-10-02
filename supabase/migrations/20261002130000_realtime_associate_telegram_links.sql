-- supabase\migrations\20261002130000_realtime_associate_telegram_links.sql
-- Adds pauperwave_associate_telegram_links to the supabase_realtime publication (user request, 2026-10-02):
-- the bot links an associate (or refreshes their @username) from any message they send, and every page
-- showing a Telegram status icon should pick that up without a refresh (useAssociateTelegramLinksRealtime.ts).
-- The existing "Management can read telegram usernames" SELECT policy gates who receives the events.
alter publication supabase_realtime add table public.pauperwave_associate_telegram_links;
