// server\api\settings\update-timer-settings.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { UpdateTimerSettingsPayload } from '#shared/types/settings'

const isValidMinutes = (value: unknown) =>
  Number.isInteger(value) && Number(value) >= 10 && Number(value) <= 120
const isValidPreRoundWaitMinutes = (value: unknown) =>
  Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 30

export default defineEventHandler(async (event) => {
  const user = await requireAdminPermission(event)

  const body = await readBody<UpdateTimerSettingsPayload>(event)

  if (!isValidMinutes(body.commanderRoundMinutes) || !isValidMinutes(body.oneVsOneRoundMinutes)) {
    throw createError({ statusCode: 400, statusMessage: 'Durata round non valida (10-120 minuti)' })
  }
  if (!isValidPreRoundWaitMinutes(body.preRoundWaitMinutes)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Attesa pre-round non valida (0-30 minuti)'
    })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)

  const settings = await updatePauperwaveSettings(supabase, event, user, {
    commander_round_minutes: body.commanderRoundMinutes,
    one_vs_one_round_minutes: body.oneVsOneRoundMinutes,
    pre_round_wait_minutes: body.preRoundWaitMinutes
  })

  return { settings }
})
