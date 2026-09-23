// server\utils\commanderDecks.ts
// A deck's lender only means anything while it's actually borrowed —
// never persist one otherwise, or toggling "is_borrowed" off would leave a
// stale lender_uuid behind. Shared by create.post.ts/update.post.ts, which
// independently duplicated this exact rule (fallow:dupes, 2026-09-23).
export function lenderUuidForBorrowed(
  isBorrowed: boolean, lenderUuid: string | null
): string | null {
  return isBorrowed ? lenderUuid : null
}
