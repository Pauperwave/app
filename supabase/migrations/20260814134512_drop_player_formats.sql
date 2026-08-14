-- supabase\migrations\20260814134512_drop_player_formats.sql
-- Drops player_formats entirely (user request, 2026-08-14) — a player <->
-- mtg_formats join table (player_uuid, format_uuid, no other columns),
-- empty (0 rows) and unreferenced by any view or app code. Raised while
-- scaffolding /players; not part of the format-driven work planned for
-- later (see docs/TODO.md's "Sidebar Commander section is hardcoded" entry
-- — mtg_formats itself still has 0 rows, so this table had nothing to link
-- yet either).

drop table if exists public.player_formats;
