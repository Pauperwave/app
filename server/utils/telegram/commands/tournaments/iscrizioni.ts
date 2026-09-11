// server\utils\telegram\commands\tournaments\iscrizioni.ts
import { it } from 'date-fns/locale'

import type { Bot, Context } from 'grammy'
import type { InputRichMessage } from 'grammy/types'
import type { CommandGroup } from '@grammyjs/commands'
import { Menu } from '@grammyjs/menu'

import { stageLabel } from './line'
import { fetchStageNumbers, OPEN_TOURNAMENT_STATUSES } from './queries'
import { torneoMenu, openTournamentDetail } from './detail'
import { requireLinkedAssociate, resolveAssociateUuidByChatId } from '../account/linking'
import { registerMenu } from '../../menuNav'
import { createPerContextCache } from '../../perContextCache'
import { ICONS } from '../../icons'
import { registerDeepLink } from '../../deepLinks'

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

async function fetchMyTournaments(associateUuid: string): Promise<MyRegistration[]> {
  const supabase = telegramServiceSupabaseClient()

  const { data, error } = await supabase
    .from('tournament_registrations')
    .select(`
      status,
      players!inner(associate_uuid),
      tournament:tournaments!inner(uuid, name, starts_at, league_uuid, location:locations(name))
    `)
    .eq('players.associate_uuid', associateUuid)
    .is('tournament.deleted_at', null)
    .in('tournament.status', OPEN_TOURNAMENT_STATUSES)

  if (error) throw error

  const rows = (data as RegistrationRow[])
    .filter((row): row is RegistrationRow & { tournament: RawTournamentRow } =>
      row.tournament !== null && row.tournament.starts_at !== null)

  // Scoped to only the leagues this associate is actually registered in —
  // see queries.ts's own comment on why.
  const leagueUuids = [...new Set(
    rows.map(row => row.tournament.league_uuid).filter(uuid => uuid !== null)
  )]
  const stageNumbers = await fetchStageNumbers(leagueUuids)

  return rows
    .map(row => ({
      registrationStatus: row.status,
      tournament: { ...row.tournament, stageNumber: stageNumbers.get(row.tournament.uuid) ?? null }
    }))
    .sort((a, b) => a.tournament.starts_at.localeCompare(b.tournament.starts_at))
}

// The command handler and iscrizioniMenu's own .dynamic() re-render both
// run fetchMyTournaments within the same update — memoizing by ctx dedupes
// it. See perContextCache.ts.
const memoize = createPerContextCache<{ registrations: Promise<MyRegistration[]> }>()

function cachedFetchMyTournaments(ctx: Context, associateUuid: string): Promise<MyRegistration[]> {
  return memoize(ctx, 'registrations', () => fetchMyTournaments(associateUuid))
}

// Named registrationIcon, not statusIcon — line.ts already exports a
// statusIcon for tournament status, a different meaning entirely.
function registrationIcon(registrationStatus: string): string {
  return registrationStatus === 'checked_in' ? ICONS.registrationCheckedIn : ICONS.registrationRegistered
}

// A button right under each tournament, embedded as its own "buttons"
// block in the rich message body — not a Menu-managed reply_markup — same
// "buttons near their own content" pattern as calendario.ts's own list
// (user request 2026-09-09, applied here too so /iscrizioni matches).
// Handled by a plain bot.on('callback_query:data', ...) below (see
// registerIscrizioniCommand) rather than @grammyjs/menu. No origin to
// encode in the payload (unlike calendario.ts's month offset) — this list
// only ever has one shape, so the uuid alone is enough.
const ISC_OPEN_PREFIX = 'iscopen:'

function encodeIscOpenPayload(uuid: string): string {
  return `${ISC_OPEN_PREFIX}${uuid}`
}

function decodeIscOpenPayload(data: string): string {
  return data.slice(ISC_OPEN_PREFIX.length)
}

function mieiTorneiBlocks(registrations: MyRegistration[]): InputRichMessage['blocks'] {
  const blocks: InputRichMessage['blocks'] = [
    { type: 'heading', size: 3, text: '🎟️ I tuoi tornei' }
  ]

  if (!registrations.length) {
    blocks.push({ type: 'paragraph', text: 'Non risulti iscritto a nessun torneo in programma.' })
    return blocks
  }

  for (const { registrationStatus, tournament } of registrations) {
    const date = formatTelegramDate(tournament.starts_at, 'EEE d MMM', { locale: it })
    const stage = stageLabel(tournament.stageNumber)

    blocks.push({
      type: 'paragraph',
      text: [`${registrationIcon(registrationStatus)} `, { type: 'bold', text: tournament.name }, stage]
    })
    blocks.push({ type: 'paragraph', text: `🗓️ ${date}` })
    if (tournament.location?.name) blocks.push({ type: 'paragraph', text: `📍 ${tournament.location.name}` })

    blocks.push({
      type: 'buttons',
      buttons: [{ text: `${ICONS.openDetails} Apri dettagli`, callback_data: encodeIscOpenPayload(tournament.uuid) }]
    })
  }

  return blocks
}

// Exported so tournament/detail.ts's "back" button can rebuild this view.
// Falls back to "not linked" for the practically unreachable case of a
// chat that unlinked mid-session.
export async function iscrizioniBlocksFor(ctx: Context, chatId: number): Promise<InputRichMessage['blocks']> {
  const associateUuid = await resolveAssociateUuidByChatId(chatId)
  if (!associateUuid) return [{ type: 'paragraph', text: 'Devi prima collegare il tuo account.' }]

  const registrations = await cachedFetchMyTournaments(ctx, associateUuid)
  return mieiTorneiBlocks(registrations)
}

// No buttons of its own any more (see ISC_OPEN_PREFIX above) — kept only
// so torneoMenu's send permission gets installed for this update (via
// .register() below) and so the "back" target from a detail view still has
// a reply_markup to hand back. Same reasoning as calendarioMenu keeping
// its .register(torneoMenu) despite calendarioMenu's own per-tournament
// buttons having moved inline too.
export const iscrizioniMenu = new Menu<Context>('isc', {
  autoAnswer: false,
  onMenuOutdated: false
})

registerMenu('isc', iscrizioniMenu)

// Handles taps on mieiTorneiBlocks's own per-tournament "buttons" blocks —
// registered before bot.use(commands) (see registerIscrizioniCommand),
// distinct callback_data prefix so it only ever claims its own presses.
async function handleIscOpenButton(ctx: Context, next: () => Promise<void>) {
  const data = ctx.callbackQuery?.data
  if (!data?.startsWith(ISC_OPEN_PREFIX)) return next()

  const uuid = decodeIscOpenPayload(data)
  await openTournamentDetail(ctx, uuid, 'i')
}

// Extracted so it can be reused verbatim by t.me/<bot>?start=iscrizioni —
// see deepLinks.ts. A "apri nel bot" button on the web app's own
// registrations page is the intended entry point (2026-09-08).
async function iscrizioniCommandHandler(ctx: Context) {
  try {
    const associateUuid = await requireLinkedAssociate(ctx)
    if (!associateUuid) return

    const registrations = await cachedFetchMyTournaments(ctx, associateUuid)
    const blocks = mieiTorneiBlocks(registrations)
    await ctx.replyWithRichMessage({ blocks }, { reply_markup: iscrizioniMenu })
  } catch {
    await ctx.replyWithRichMessage({
      markdown: '⚠️ Non sono riuscito a recuperare i tuoi tornei, riprova più tardi.'
    })
  }
}

registerDeepLink('iscrizioni', iscrizioniCommandHandler)

export function registerIscrizioniCommand(bot: Bot, commands: CommandGroup<Context>) {
  // Deferred to call time, not module top level — see calendario.ts's own
  // comment on why.
  iscrizioniMenu.register(torneoMenu)
  bot.use(iscrizioniMenu)

  // Registered before bot.use(commands) — same reasoning as
  // calendario.ts's own handleCalendarioOpenButton registration.
  bot.on('callback_query:data', handleIscOpenButton)

  commands.command('iscrizioni', 'I tornei a cui sei iscritto', iscrizioniCommandHandler)
}
