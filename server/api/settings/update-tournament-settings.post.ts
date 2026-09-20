// server\api\settings\update-tournament-settings.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database, Json } from '#shared/utils/types/database'
import type { UpdateTournamentSettingsPayload } from '#shared/types/settings'

const isPositiveInteger = (value: unknown) => Number.isInteger(value) && Number(value) >= 1
const isValidMinutes = (value: unknown) =>
  Number.isInteger(value) && Number(value) >= 10 && Number(value) <= 120

export default defineEventHandler(async (event) => {
  const user = await requireAdminPermission(event)

  const body = await readBody<UpdateTournamentSettingsPayload>(event)

  if (!isValidMinutes(body.commanderRoundMinutes) || !isValidMinutes(body.oneVsOneRoundMinutes)) {
    throw createError({ statusCode: 400, statusMessage: 'Durata round non valida (10-120 minuti)' })
  }
  const roundCounts = [
    body.commanderRoundCount, body.oneVsOneRoundCount, body.swissRoundCountBeyond
  ]
  if (!roundCounts.every(isPositiveInteger)) {
    throw createError({ statusCode: 400, statusMessage: 'Numero di round non valido' })
  }

  const tiers = body.swissRoundCountTiers
  const tiersAreValid = tiers.every((tier, index) =>
    isPositiveInteger(tier.maxPlayers)
    && isPositiveInteger(tier.rounds)
    && (index === 0 || tier.maxPlayers > (tiers[index - 1]?.maxPlayers ?? 0)))
  if (!tiersAreValid) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Fasce giocatori non valide (giocatori crescenti, round interi)'
    })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)

  const settings = await updatePauperwaveSettings(supabase, event, user, {
    commander_round_minutes: body.commanderRoundMinutes,
    one_vs_one_round_minutes: body.oneVsOneRoundMinutes,
    commander_round_count: body.commanderRoundCount,
    one_vs_one_round_count: body.oneVsOneRoundCount,
    swiss_round_count_tiers: tiers as unknown as Json,
    swiss_round_count_beyond: body.swissRoundCountBeyond
  })

  return { settings }
})
