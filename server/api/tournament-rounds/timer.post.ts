// server\api\tournament-rounds\timer.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { RoundTimerPhase } from '#shared/utils/tournaments/roundTimerState'

interface PublishRoundTimerBody {
  tournamentUuid: string
  roundNumber: number
  phase: RoundTimerPhase
  isRunning: boolean
  // Elapsed seconds in the current phase at the moment of the action
  elapsedSeconds: number
  preSeconds: number
  roundSeconds: number
  turnsSeconds: number
}

const PHASES: RoundTimerPhase[] = ['pre', 'round', 'turns', 'ended']

function isWholeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

// The organizer's timer publishes its state here after every action, for the Telegram Mini App to
// follow. The start instant is computed from the server clock, not the organizer's device clock,
// so a reader never inherits a skewed one.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const body = await readBody<PublishRoundTimerBody>(event)
  const valid = typeof body.tournamentUuid === 'string'
    && isWholeNumber(body.roundNumber)
    && PHASES.includes(body.phase)
    && typeof body.isRunning === 'boolean'
    && isWholeNumber(body.elapsedSeconds)
    && isWholeNumber(body.preSeconds)
    && isWholeNumber(body.roundSeconds)
    && isWholeNumber(body.turnsSeconds)
  if (!valid) {
    throw createError({ statusCode: 400, statusMessage: 'Stato del timer non valido' })
  }

  const now = Date.now()
  const running = body.isRunning && body.phase !== 'ended'
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { error } = await supabase
    .from('tournament_round_timers')
    .upsert({
      tournament_uuid: body.tournamentUuid,
      round_number: body.roundNumber,
      phase: body.phase,
      is_running: running,
      phase_started_at: running ? new Date(now - body.elapsedSeconds * 1000).toISOString() : null,
      paused_elapsed_seconds: running ? 0 : body.elapsedSeconds,
      pre_seconds: body.preSeconds,
      round_seconds: body.roundSeconds,
      turns_seconds: body.turnsSeconds,
      updated_at: new Date(now).toISOString()
    }, { onConflict: 'tournament_uuid,round_number' })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true }
})
