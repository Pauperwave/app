// server\utils\telegram\commands\iscrizioni.ts
import { InlineKeyboard } from 'grammy'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { formatButtonDate, stageLabel, tournamentButtonLabel } from './tournament/line'
import { fetchStageNumbers } from './tournament/queries'
import { requireLinkedAssociate } from './linking'
import { FormattedString } from '@grammyjs/parse-mode'
import type { Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'

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

function mieiTorneiMessage(registrations: MyRegistration[]): FormattedString {
  const header = fmt`🎟️ ${FormattedString.b('I tuoi tornei')}`

  if (!registrations.length) {
    return fmt`${header}\n\nNon risulti iscritto a nessun torneo in programma.`
  }

  const lines = registrations.map(({ registrationStatus, tournament }) => {
    const date = format(new Date(tournament.starts_at), 'EEE d MMM', { locale: it })
    const location = tournament.location?.name ? `\n  📍 ${tournament.location.name}` : ''
    const stage = stageLabel(tournament.stageNumber)
    return fmt`${statusIcon(registrationStatus)} ${FormattedString.b(date)}${stage} — ${tournament.name}${location}`
  })

  return fmt`${header}\n\n${FormattedString.join(lines, '\n')}\n\n👇 Tocca un torneo per i dettagli`
}

function mieiTorneiKeyboard(registrations: MyRegistration[]): InlineKeyboard {
  const keyboard = new InlineKeyboard()
  for (const { registrationStatus, tournament } of registrations) {
    // Reuses the shared tournament detail view (tournament/detail.ts) —
    // same torneo:<uuid>:<origin> callback, "m0" (calendario, current
    // month) as a reasonable fallback back-target since this list isn't
    // itself scoped to a single month.
    const date = formatButtonDate(tournament.starts_at)
    const label = tournamentButtonLabel(
      statusIcon(registrationStatus), date, tournament.stageNumber, tournament.name
    )
    keyboard.row().text(label, `torneo:${tournament.uuid}:m0`)
  }
  return keyboard
}

export function registerIscrizioniCommand(commands: CommandGroup<Context>) {
  commands.command('iscrizioni', 'I tornei a cui sei iscritto', async (ctx) => {
    try {
      const associateUuid = await requireLinkedAssociate(ctx)
      if (!associateUuid) return

      const registrations = await fetchMyTournaments(associateUuid)
      const message = mieiTorneiMessage(registrations)
      await ctx.reply(message.text, {
        entities: message.entities,
        reply_markup: mieiTorneiKeyboard(registrations)
      })
    } catch {
      await ctx.reply('⚠️ Non sono riuscito a recuperare i tuoi tornei, riprova più tardi.')
    }
  })
}
