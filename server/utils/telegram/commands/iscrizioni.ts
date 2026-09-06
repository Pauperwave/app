// server\utils\telegram\commands\iscrizioni.ts
import { Menu } from '@grammyjs/menu'
import { it } from 'date-fns/locale'
import { formatButtonDate, stageLabel, tournamentButtonLabel } from './tournament/line'
import { fetchStageNumbers } from './tournament/queries'
import { torneoMenu, openTournamentDetail } from './tournament/detail'
import { requireLinkedAssociate, resolveAssociateUuidByChatId } from './linking'
import { registerMenu } from '../menuNav'
import { FormattedString } from '@grammyjs/parse-mode'
import type { Bot, Context } from 'grammy'
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
    const date = formatTelegramDate(tournament.starts_at, 'EEE d MMM', { locale: it })
    const location = tournament.location?.name ? `\n  📍 ${tournament.location.name}` : ''
    const stage = stageLabel(tournament.stageNumber)
    return fmt`${statusIcon(registrationStatus)} ${FormattedString.b(date)}${stage} — ${tournament.name}${location}`
  })

  return fmt`${header}\n\n${FormattedString.join(lines, '\n')}\n\n👇 Tocca un torneo per i dettagli`
}

// Exported so tournament/detail.ts's shared "back" button can rebuild this
// exact view when returning from a detail page opened from here. Falls back
// to a "not linked" message in the (practically unreachable) case of a chat
// that unlinked mid-session — reaching iscrizioni-menu at all already
// requires being linked, via requireLinkedAssociate in the command handler.
export async function iscrizioniText(chatId: number): Promise<FormattedString> {
  const associateUuid = await resolveAssociateUuidByChatId(chatId)
  if (!associateUuid) return new FormattedString('Devi prima collegare il tuo account.')

  const registrations = await fetchMyTournaments(associateUuid)
  return mieiTorneiMessage(registrations)
}

// autoAnswer: false — the "open tournament" buttons delegate to
// openTournamentDetail, which answers the callback itself.
export const iscrizioniMenu = new Menu<Context>('isc', { autoAnswer: false }).dynamic(async (ctx, range) => {
  const chatId = ctx.chat?.id
  if (!chatId) return

  const associateUuid = await resolveAssociateUuidByChatId(chatId)
  if (!associateUuid) return

  const registrations = await fetchMyTournaments(associateUuid)
  for (const { registrationStatus, tournament } of registrations) {
    const date = formatButtonDate(tournament.starts_at)
    const label = tournamentButtonLabel(
      statusIcon(registrationStatus), date, tournament.stageNumber, tournament.name
    )
    range.row().text(
      { text: label, payload: `${tournament.uuid}:i` },
      ctx => openTournamentDetail(ctx, tournament.uuid, 'i')
    )
  }
})

registerMenu('isc', iscrizioniMenu)

export function registerIscrizioniCommand(bot: Bot, commands: CommandGroup<Context>) {
  // Deferred to call time, not module top level — see calendario.ts's own
  // comment on why.
  iscrizioniMenu.register(torneoMenu)
  bot.use(iscrizioniMenu)

  commands.command('iscrizioni', 'I tornei a cui sei iscritto', async (ctx) => {
    try {
      const associateUuid = await requireLinkedAssociate(ctx)
      if (!associateUuid) return

      const registrations = await fetchMyTournaments(associateUuid)
      const message = mieiTorneiMessage(registrations)
      await ctx.reply(message.text, { entities: message.entities, reply_markup: iscrizioniMenu })
    } catch {
      await ctx.reply('⚠️ Non sono riuscito a recuperare i tuoi tornei, riprova più tardi.')
    }
  })
}
