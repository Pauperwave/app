// server\utils\telegram\commands\iscrizioni.ts
import { InlineKeyboard } from 'grammy'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { fetchStageNumbers } from './calendario'
import type { Bot } from 'grammy'

interface MyTournamentRow {
  uuid: string
  name: string
  starts_at: string
  location: { name: string | null } | null
  stageNumber: number | null
}

interface RawTournamentRow {
  uuid: string
  name: string
  starts_at: string
  league_uuid: string | null
  location: { name: string | null } | null
}

interface RegistrationRow {
  status: string
  tournament: RawTournamentRow | null
}

interface MyRegistration {
  registrationStatus: string
  tournament: MyTournamentRow
}

// Only "still relevant" statuses — a completed/cancelled/draft tournament
// isn't an upcoming commitment worth listing here (unlike /tornei, this
// command answers "what am I signed up for", not "what happened").
const ACTIVE_TOURNAMENT_STATUSES = ['registration_open', 'in_progress']

async function fetchMyTournaments(associateUuid: string): Promise<MyRegistration[]> {
  const supabase = telegramServiceSupabaseClient()

  const [{ data, error }, stageNumbers] = await Promise.all([
    supabase
      .from('tournament_registrations')
      .select(`
        status,
        players!inner(associate_uuid),
        tournament:tournaments!inner(uuid, name, starts_at, league_uuid, location:locations(name))
      `)
      .eq('players.associate_uuid', associateUuid)
      .is('tournament.deleted_at', null)
      .in('tournament.status', ACTIVE_TOURNAMENT_STATUSES),
    fetchStageNumbers()
  ])

  if (error) throw error

  return (data as RegistrationRow[])
    .filter((row): row is RegistrationRow & { tournament: RawTournamentRow } =>
      row.tournament !== null && row.tournament.starts_at !== null)
    .map(row => ({
      registrationStatus: row.status,
      tournament: { ...row.tournament, stageNumber: stageNumbers.get(row.tournament.uuid) ?? null }
    }))
    .sort((a, b) => a.tournament.starts_at.localeCompare(b.tournament.starts_at))
}

function statusIcon(registrationStatus: string): string {
  return registrationStatus === 'checked_in' ? '🎯' : '✅'
}

function stageLabel(tournament: MyTournamentRow): string {
  return tournament.stageNumber ? ` — ${tournament.stageNumber}ª tappa` : ''
}

function mieiTorneiMessage(registrations: MyRegistration[]): string {
  const header = '🎟️ *I tuoi tornei*'

  if (!registrations.length) {
    return `${header}\n\nNon risulti iscritto a nessun torneo in programma.`
  }

  const lines = registrations.map(({ registrationStatus, tournament }) => {
    const date = format(new Date(tournament.starts_at), 'EEE d MMM', { locale: it })
    const location = tournament.location?.name ? `\n  📍 ${tournament.location.name}` : ''
    return `${statusIcon(registrationStatus)} *${date}*${stageLabel(tournament)} — ${tournament.name}${location}`
  })

  return `${header}\n\n${lines.join('\n')}\n\n👇 Tocca un torneo per i dettagli`
}

function mieiTorneiKeyboard(registrations: MyRegistration[]): InlineKeyboard {
  const keyboard = new InlineKeyboard()
  for (const { tournament } of registrations) {
    // Reuses /calendario's own detail view (commands/calendario.ts) — same
    // torneo:<uuid>:<origin> callback, "m0" (calendario, current month) as
    // a reasonable fallback back-target since this list isn't itself
    // scoped to a single month.
    keyboard.row().text(`🎲 ${tournament.name}`, `torneo:${tournament.uuid}:m0`)
  }
  return keyboard
}

export function registerIscrizioniCommand(bot: Bot) {
  bot.command('iscrizioni', async (ctx) => {
    const chatId = ctx.chat?.id
    if (!chatId) return

    try {
      const associateUuid = await resolveAssociateUuidByChatId(chatId)
      if (!associateUuid) {
        await ctx.reply('Devi prima collegare il tuo account: scrivimi la tua email da socio.')
        return
      }

      const registrations = await fetchMyTournaments(associateUuid)
      await ctx.reply(mieiTorneiMessage(registrations), {
        parse_mode: 'Markdown',
        reply_markup: mieiTorneiKeyboard(registrations)
      })
    } catch {
      await ctx.reply('⚠️ Non sono riuscito a recuperare i tuoi tornei, riprova più tardi.')
    }
  })
}
