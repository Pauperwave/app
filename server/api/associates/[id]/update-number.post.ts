// server\api\associates\[id]\update-number.post.ts
// Separate from update.post.ts on purpose: pauperwave_associate_number isn't
// part of associateFormSchema (AddModal.vue and EditModal.vue's shared form)
// — a new applicant never sets it, and it's usually auto-assigned on
// approval now (see approve.post.ts). This lets staff fix/assign it by hand
// for the legacy rows that predate that mechanism (user request, 2026-08-27),
// without threading a roster-only field through the shared application form.
interface UpdateAssociateNumberPayload {
  pauperwave_associate_number: string | null
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<UpdateAssociateNumberPayload>(event)

  const data = await updateAssociateById(
    event,
    id,
    { pauperwave_associate_number: body.pauperwave_associate_number },
    'Associate number update failed'
  )

  return { associate: data }
})
