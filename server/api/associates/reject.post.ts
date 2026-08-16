// server\api\associates\reject.post.ts
export default defineEventHandler(event =>
  bulkUpdateMembershipRequestStatus(event, 'rejected', 'rejection'))
