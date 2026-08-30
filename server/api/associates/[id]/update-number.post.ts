// server\api\associates\[id]\update-number.post.ts
// Separate from update.post.ts on purpose: pauperwave_associate_number isn't
// part of associateFormSchema (AddModal.vue and EditModal.vue's shared form)
// — a new applicant never sets it, and it's usually auto-assigned on
// approval now (see approve.post.ts). This lets staff fix/assign it by hand
// for the legacy rows that predate that mechanism (user request, 2026-08-27),
// without threading a roster-only field through the shared application form.
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface UpdateAssociateNumberPayload {
  pauperwave_associate_number: string | null
}

export default defineEventHandler(async (event) => {
  // Not parseIdMutationRequest (organizer-level) — same "Gestire
  // l'anagrafica soci" (admin-only) reasoning as update.post.ts, found
  // unenforced via audit, 2026-08-30.
  const user = await requireAdminPermission(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<UpdateAssociateNumberPayload>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await supabase
    .from('pauperwave_associates')
    .update({
      pauperwave_associate_number: body.pauperwave_associate_number,
      ...await auditColumnsForUpdate(event, user)
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Associate number update failed'
    })
  }

  return { associate: data }
})
