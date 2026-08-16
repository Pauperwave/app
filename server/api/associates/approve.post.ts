// server\api\associates\approve.post.ts
export default defineEventHandler(event =>
  bulkUpdateMembershipRequestStatus(event, 'approved', 'approval'))
