// server\api\associates\[id]\update.post.ts
import type { AssociateEditsPayload } from '#shared/types/associates'

// Not parseIdMutationRequest (organizer-level) — "Gestire l'anagrafica soci"
// is admin-only in the permissions matrix (docs/architecture/permissions.md),
// found unenforced via audit, 2026-08-30 — see updateAssociateById.
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<AssociateEditsPayload>(event)

  const data = await updateAssociateById(event, id, body, 'Associate update failed')

  return { associate: data }
})
