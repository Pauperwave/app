// server\api\events.ts
// fallow-ignore-file code-duplication -- mirrors leagues.ts/tournaments.ts's mock
// generator shape on purpose; expected to diverge once real Supabase tables land
// Mock data generator lives in server/utils/mockEvents.ts (MOCK_EVENTS,
// auto-imported) — shared with tournaments.ts, see that file's comment.
export default defineEventHandler(async () => {
  return MOCK_EVENTS
})
