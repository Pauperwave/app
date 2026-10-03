// server\api\associates\[id]\update.post.ts
import type { AssociateEditsPayload } from '#shared/types/associates'

// Not parseIdMutationRequest (organizer-level): managing the associates registry is admin-only
// in the permissions matrix (docs/architecture/permissions.md), see updateAssociateById.
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<AssociateEditsPayload>(event)

  const data = await updateAssociateById(event, id, body, 'Associate update failed')

  return { associate: data }
})
