// server\api\associates\[id]\update-number.post.ts
// Separate from update.post.ts: pauperwave_associate_number isn't part of associateFormSchema and
// is auto-assigned on approval (approve.post.ts). Lets staff fix/assign it by hand for legacy rows.
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
