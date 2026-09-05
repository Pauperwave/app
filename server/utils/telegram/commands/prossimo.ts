// server\utils\telegram\commands\prossimo.ts
import { formatTournamentDateTime, tournamentHeader } from './tournament/line'
import { fetchStageNumbers } from './tournament/queries'
import type { Bot } from 'grammy'
import { FormattedString } from '@grammyjs/parse-mode'

interface NextTournamentRow {
  uuid: string
  name: string
  starts_at: string | null
  status: string
  location: { name: string | null } | null
}

const OPEN_STATUSES = ['registration_open', 'in_progress']

async function nextTournamentMessage(): Promise<FormattedString> {
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
  if (!row || !row.starts_at) return new FormattedString('🎲 Nessun torneo in programma al momento.')

  const date = formatTournamentDateTime(row.starts_at)
  const header = tournamentHeader(row.status, row.name, stageNumbers.get(row.uuid) ?? null)
  const location = row.location?.name ? `\n📍 ${row.location.name}` : ''

  return fmt`🎲 ${FormattedString.b('Prossimo torneo')}\n\n${header}\n🗓️ ${date}${location}`
}

export function registerProssimoCommand(bot: Bot) {
  bot.command('prossimo', async (ctx) => {
    const message = await nextTournamentMessage()
      .catch(() => new FormattedString('⚠️ Non sono riuscito a recuperare il prossimo torneo, riprova più tardi.'))
    await ctx.reply(message.text, { entities: message.entities })
  })
}
