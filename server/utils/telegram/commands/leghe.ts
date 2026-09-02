// server\utils\telegram\commands\leghe.ts
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import type { Bot } from 'grammy'

interface ActiveLeagueRow {
  uuid: string
  name: string
  starts_at: string | null
  ends_at: string | null
}

interface LeagueTournamentRow {
  league_uuid: string | null
  status: string
}

// Same "cancelled tournaments don't count toward the denominator" rule as
// useLeaguesQuery.ts's tournamentProgressByLeague — a cancelled tournament
// isn't "still to complete", so progress reads e.g. 3/5, not a permanently
// deflated 3/6.
function progressByLeague(rows: LeagueTournamentRow[]) {
  const totals = new Map<string, number>()
  const completed = new Map<string, number>()
  for (const row of rows) {
    if (!row.league_uuid || row.status === 'cancelled') continue
    totals.set(row.league_uuid, (totals.get(row.league_uuid) ?? 0) + 1)
    if (row.status === 'completed') {
      completed.set(row.league_uuid, (completed.get(row.league_uuid) ?? 0) + 1)
    }
  }
  return { totals, completed }
}

function formatDate(date: string | null): string | null {
  return date ? format(new Date(date), 'd MMM yyyy', { locale: it }) : null
}

async function activeLeaguesMessage(): Promise<string> {
  const supabase = publicSupabaseClient()

  const { data: leagues, error: leaguesError } = await supabase
    .from('leagues')
    .select('uuid, name, starts_at, ends_at')
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('starts_at', { ascending: true })

  if (leaguesError) throw leaguesError
  if (!leagues.length) return '🏆 Nessuna lega attiva al momento.'

  const leagueUuids = (leagues as ActiveLeagueRow[]).map(league => league.uuid)
  const { data: tournaments, error: tournamentsError } = await supabase
    .from('tournaments')
    .select('league_uuid, status')
    .in('league_uuid', leagueUuids)
    .is('deleted_at', null)

  if (tournamentsError) throw tournamentsError
  const { totals, completed } = progressByLeague(tournaments as LeagueTournamentRow[])

  const lines = (leagues as ActiveLeagueRow[]).map((league) => {
    const total = totals.get(league.uuid) ?? 0
    const done = completed.get(league.uuid) ?? 0
    const progress = total > 0 ? ` (${done}/${total} tornei)` : ''
    const start = formatDate(league.starts_at)
    const end = formatDate(league.ends_at)
    const dateRange = start && end ? ` — ${start} → ${end}` : start ? ` — dal ${start}` : ''
    return `• ${league.name}${progress}${dateRange}`
  })

  return `🏆 *Leghe attive*\n\n${lines.join('\n')}`
}

export function registerLegheCommand(bot: Bot) {
  bot.command('leghe', async (ctx) => {
    const message = await activeLeaguesMessage()
      .catch(() => '⚠️ Non sono riuscito a recuperare le leghe, riprova più tardi.')
    await ctx.reply(message, { parse_mode: 'Markdown' })
  })
}
