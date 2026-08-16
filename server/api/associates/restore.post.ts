// server\api\associates\restore.post.ts
// Reverts a rejected membership request back to 'pending', putting it back
// into the triage queue — the counterpart to reject.post.ts.
export default defineEventHandler(event =>
  bulkUpdateMembershipRequestStatus(event, 'pending', 'restore'))
