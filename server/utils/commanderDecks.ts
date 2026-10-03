// server\utils\commanderDecks.ts
// A deck's lender only means something while it is borrowed: never persist one otherwise, or
// toggling "is_borrowed" off would leave a stale lender_uuid. Shared by
// create.post.ts/update.post.ts.
export function lenderUuidForBorrowed(
  isBorrowed: boolean, lenderUuid: string | null
): string | null {
  return isBorrowed ? lenderUuid : null
}
