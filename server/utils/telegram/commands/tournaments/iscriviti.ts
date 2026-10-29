// server\utils\telegram\commands\tournaments\iscriviti.ts
import type { Bot, Context } from 'grammy'
import type { InputRichMessage } from 'grammy/types'
import type { CommandGroup } from '@grammyjs/commands'

import { personalIcon, stageLabel, formatTournamentDateTime } from './line'
import { fetchRegistrationStatuses, fetchStageNumbers, fetchStartedRounds } from './queries'
import type { RegistrationStatus } from './queries'
import {
  CANCEL_REFUSED_TEXT, TOURNAMENT_FULL_TEXT, cancelTournamentRegistration, isExternalOrganizer,
  registerForTournament
} from './registration'
import { NOT_LINKED_MESSAGE, requireLinkedAssociate, resolveAssociateUuidByChatId } from '../account/linking'
import { answerEditError, requireChatId } from '../callbackErrors'
import { encodeHelpBtn } from '../../helpButton'
import { registerDeepLink } from '../../deepLinks'
import { REGISTRATION_STATUSES } from '#shared/utils/tournaments/registrationStatus'
import { ICONS } from '~~/server/utils/telegram/icons'

interface RawTournamentRow {
  uuid: string
  name: string
  starts_at: string | null
  league_uuid: string | null
  location: { name: string | null } | null
  organizer: { type: string | null } | null
}

export interface OpenTournament {
  uuid: string
  name: string
  startsAt: string
  locationName: string | null
  stageNumber: number | null
  // Rounds already started: above 0 the player would join a tournament under way
  startedRounds: number
  registration: RegistrationStatus
}

// A "buttons" block under each tournament in the rich message body (not a Menu reply_markup), like
// iscrizioni.ts: handled by a plain bot.on('callback_query:data') registered before bot.use(commands)
const REGISTER_PREFIX = 'iscriviti:'
const CANCEL_PREFIX = 'annulla:'

type ButtonAction = 'register' | 'cancel'

function decodeButton(data: string): { action: ButtonAction, tournamentUuid: string } | null {
  if (data.startsWith(REGISTER_PREFIX)) {
    return { action: 'register', tournamentUuid: data.slice(REGISTER_PREFIX.length) }
  }
  if (data.startsWith(CANCEL_PREFIX)) {
    return { action: 'cancel', tournamentUuid: data.slice(CANCEL_PREFIX.length) }
  }
  return null
}

async function fetchOpenTournaments(associateUuid: string): Promise<OpenTournament[]> {
  const now = new Date().toISOString()
  const { data, error } = await publicSupabaseClient()
    .from('tournaments')
    .select('uuid, name, starts_at, league_uuid, location:locations(name), organizer:organizations(type)')
    .is('deleted_at', null)
    .in('status', REGISTRATION_STATUSES)
    // Until it ends, not until it starts: a tournament already under way can be joined at a later
    // round. Without an end time it falls back to the start time.
    .or(`ends_at.gte.${now},and(ends_at.is.null,starts_at.gte.${now})`)
    .order('starts_at', { ascending: true })
  if (error) throw error

  // Shop-organized tournaments are not ours to register for, see registration.ts's isExternalOrganizer
  const rows = (data as RawTournamentRow[]).filter(
    (row): row is RawTournamentRow & { starts_at: string } =>
      row.starts_at !== null && !isExternalOrganizer(row)
  )
  if (!rows.length) return []

  const leagueUuids = [...new Set(rows.map(row => row.league_uuid).filter(uuid => uuid !== null))]
  const [statuses, stageNumbers, startedRounds] = await Promise.all([
    fetchRegistrationStatuses(rows.map(row => row.uuid), associateUuid),
    fetchStageNumbers(leagueUuids),
    fetchStartedRounds(rows.map(row => row.uuid))
  ])

  return rows.map(row => ({
    uuid: row.uuid,
    name: row.name,
    startsAt: row.starts_at,
    locationName: row.location?.name ?? null,
    stageNumber: stageNumbers.get(row.uuid) ?? null,
    startedRounds: startedRounds.get(row.uuid) ?? 0,
    registration: statuses.get(row.uuid) ?? null
  }))
}

function tournamentButton(tournament: OpenTournament, onlyOne: boolean) {
  if (tournament.registration === 'registered') {
    return { text: `${ICONS.failure} Annulla iscrizione`, callback_data: `${CANCEL_PREFIX}${tournament.uuid}` }
  }
  // With a single tournament the tap is a confirmation, so the label says so
  return {
    text: `${ICONS.register} ${onlyOne ? 'Conferma iscrizione' : 'Iscriviti'}`,
    callback_data: `${REGISTER_PREFIX}${tournament.uuid}`
  }
}

function startedRoundsWarning(startedRounds: number): string {
  const rounds = startedRounds === 1 ? 'è già stato avviato 1 round' : `sono già stati avviati ${startedRounds} round`
  return `Il torneo è già iniziato: ${rounds}.`
}

export function iscrivitiBlocks(tournaments: OpenTournament[]): InputRichMessage['blocks'] {
  const blocks: InputRichMessage['blocks'] = [
    { type: 'heading', size: 3, text: `${ICONS.register} Iscriviti a un torneo` }
  ]

  if (!tournaments.length) {
    blocks.push({ type: 'paragraph', text: 'Nessun torneo ha le iscrizioni aperte al momento.' })
    blocks.push({
      type: 'buttons',
      buttons: [{ text: `${ICONS.calendar} Calendario`, callback_data: encodeHelpBtn('calendario') }]
    })
    return blocks
  }

  const onlyOne = tournaments.length === 1
  blocks.push({
    type: 'paragraph',
    text: onlyOne ? 'Vuoi iscriverti a questo torneo?' : 'Scegli il torneo a cui iscriverti:'
  })

  for (const tournament of tournaments) {
    blocks.push({
      type: 'paragraph',
      text: [
        `${personalIcon(tournament.registration)} `,
        { type: 'bold', text: tournament.name },
        stageLabel(tournament.stageNumber)
      ]
    })
    blocks.push({ type: 'paragraph', text: `${ICONS.date} ${formatTournamentDateTime(tournament.startsAt)}` })
    if (tournament.locationName) {
      blocks.push({ type: 'paragraph', text: `${ICONS.location} ${tournament.locationName}` })
    }

    if (tournament.startedRounds > 0 && tournament.registration === null) {
      blocks.push({ type: 'paragraph', text: `${ICONS.warning} ${startedRoundsWarning(tournament.startedRounds)}` })
    }

    // The registration can't be cancelled after the check-in (see registration.ts), so no button
    if (tournament.registration === 'checked_in') {
      blocks.push({ type: 'paragraph', text: 'Check-in già effettuato.' })
    } else {
      blocks.push({ type: 'buttons', buttons: [tournamentButton(tournament, onlyOne)] })
    }
  }

  return blocks
}

async function iscrivitiBlocksFor(associateUuid: string): Promise<InputRichMessage['blocks']> {
  return iscrivitiBlocks(await fetchOpenTournaments(associateUuid))
}

// Extracted for reuse by t.me/<bot>?start=iscriviti (deepLinks.ts) and /help's quick-launch button
async function iscrivitiCommandHandler(ctx: Context) {
  try {
    const associateUuid = await requireLinkedAssociate(ctx)
    if (!associateUuid) return

    await ctx.replyWithRichMessage({ blocks: await iscrivitiBlocksFor(associateUuid) })
  } catch {
    await ctx.replyWithRichMessage({
      markdown: `${ICONS.warning} Non sono riuscito a recuperare i tornei, riprova più tardi.`
    })
  }
}

registerDeepLink('iscriviti', iscrivitiCommandHandler)

type Outcome = { ok: true, toast: string } | { ok: false, alert: string }

async function applyAction(
  action: ButtonAction, tournamentUuid: string, associateUuid: string
): Promise<Outcome> {
  if (action === 'register') {
    const outcome = await registerForTournament(tournamentUuid, associateUuid)
    return outcome === 'full'
      ? { ok: false, alert: TOURNAMENT_FULL_TEXT }
      : { ok: true, toast: `${ICONS.success} Iscrizione confermata!` }
  }

  const outcome = await cancelTournamentRegistration(tournamentUuid, associateUuid)
  return outcome === 'cancelled'
    ? { ok: true, toast: `${ICONS.success} Iscrizione annullata.` }
    : { ok: false, alert: CANCEL_REFUSED_TEXT[outcome] }
}

// Registers or cancels, then redraws the same message so the button flips in place
async function handleIscrivitiButton(ctx: Context, next: () => Promise<void>) {
  const button = decodeButton(ctx.callbackQuery?.data ?? '')
  if (!button) return next()

  const chatId = await requireChatId(ctx)
  if (!chatId) return

  const associateUuid = await resolveAssociateUuidByChatId(chatId)
  if (!associateUuid) {
    await ctx.answerCallbackQuery({ text: NOT_LINKED_MESSAGE, show_alert: true })
    return
  }

  let outcome: Outcome
  try {
    outcome = await applyAction(button.action, button.tournamentUuid, associateUuid)
  } catch {
    await ctx.answerCallbackQuery({ text: 'Errore, riprova più tardi.', show_alert: true })
    return
  }
  if (!outcome.ok) {
    await ctx.answerCallbackQuery({ text: outcome.alert, show_alert: true })
    return
  }

  try {
    await ctx.editMessageText({ blocks: await iscrivitiBlocksFor(associateUuid) })
    await ctx.answerCallbackQuery({ text: outcome.toast })
  } catch (err) {
    await answerEditError(ctx, err)
  }
}

export function registerIscrivitiCommand(bot: Bot, commands: CommandGroup<Context>) {
  // Registered before bot.use(commands), like iscrizioni.ts
  bot.on('callback_query:data', handleIscrivitiButton)

  commands.command('iscriviti', 'Iscriviti a un torneo con le iscrizioni aperte', iscrivitiCommandHandler)
}
