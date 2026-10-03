// server\api\telegram\round-timer.post.ts
import type {
  RoundTimerResponse, RoundTimerSnapshot, RoundTimerStatus
} from '#shared/utils/tournaments/roundTimerState'
import { resolveAssociateUuidByChatId } from '../../utils/telegram/commands/account/linking'
import { fetchLiveTable } from '../../utils/telegram/commands/tournaments/matchReportData'
import { fetchLivePod } from '../../utils/telegram/commands/tournaments/commanderPodData'
import { verifyWebAppInitData } from '../../utils/telegram/webAppAuth'

interface RoundTimerBody {
  initData?: string
}

// The event timer of the round the caller is playing, for the turns Mini App. The caller is
// identified by Telegram's signed initData (an unsigned user id would be trivially forged), then
// resolved to their linked associate and their live table, 1v1 or Commander pod.
export default defineEventHandler(async (event): Promise<RoundTimerResponse> => {
  const { initData } = await readBody<RoundTimerBody>(event)
  const serverNowMs = Date.now()
  const respond = (status: RoundTimerStatus, snapshot: RoundTimerSnapshot | null = null) => (
    { status, snapshot, serverNowMs }
  )

  const user = verifyWebAppInitData(
    initData ?? '', useRuntimeConfig(event).telegramBotToken ?? '', serverNowMs
  )
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Dati Telegram non validi' })
  }

  // A Telegram user id and their private chat id are the same number
  const associateUuid = await resolveAssociateUuidByChatId(user.id)
  if (!associateUuid) return respond('unlinked')

  const table = await fetchLiveTable(associateUuid) ?? await fetchLivePod(associateUuid)
  if (!table) return respond('no-table')

  const { data, error } = await telegramServiceSupabaseClient()
    .from('tournament_round_timers')
    .select('*')
    .eq('tournament_uuid', table.tournamentUuid)
    .eq('round_number', table.roundNumber)
    .maybeSingle()
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  if (!data) return respond('no-timer')

  return respond('ok', {
    phase: data.phase as RoundTimerSnapshot['phase'],
    isRunning: data.is_running,
    phaseStartedAtMs: data.phase_started_at ? Date.parse(data.phase_started_at) : null,
    pausedElapsedSeconds: data.paused_elapsed_seconds,
    preSeconds: data.pre_seconds,
    roundSeconds: data.round_seconds,
    turnsSeconds: data.turns_seconds
  })
})
