// server\utils\telegram\commands\prossimo.ts
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { tournamentHeader } from './tournamentLine'
import { fetchStageNumbers } from './tournamentQueries'
import type { Bot } from 'grammy'

interface NextTournamentRow {
  uuid: string
  name: string
  starts_at: string | null
  status: string
  location: { name: string | null } | null
}

const OPEN_STATUSES = ['registration_open', 'in_progress']

async function nextTournamentMessage(): Promise<string> {
  const supabase = publicSupabaseClient()

  const [{ data, error }, stageNumbers] = await Promise.all([
    supabase
      .from('tournaments')
      .select('uuid, name, starts_at, status, location:locations(name)')
      .is('deleted_at', null)
      .in('status', OPEN_STATUSES)
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    fetchStageNumbers()
  ])

  if (error) throw error
  const row = data as NextTournamentRow | null
  if (!row || !row.starts_at) return '🎲 Nessun torneo in programma al momento.'

  const date = format(new Date(row.starts_at), 'EEEE d MMMM \'alle\' HH:mm', { locale: it })
  const header = tournamentHeader(row.status, row.name, stageNumbers.get(row.uuid) ?? null)
  const location = row.location?.name ? `\n📍 ${row.location.name}` : ''

  return `🎲 *Prossimo torneo*\n\n${header}\n🗓️ ${date}${location}`
}

export function registerProssimoCommand(bot: Bot) {
  bot.command('prossimo', async (ctx) => {
    const message = await nextTournamentMessage()
      .catch(() => '⚠️ Non sono riuscito a recuperare il prossimo torneo, riprova più tardi.')
    await ctx.reply(message, { parse_mode: 'Markdown' })
  })
}
