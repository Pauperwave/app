// server\utils\telegram\commands\tournaments\iscrizioni.ts
import { it } from 'date-fns/locale'

import type { Bot, Context } from 'grammy'
import type { InputRichMessage } from 'grammy/types'
import type { CommandGroup } from '@grammyjs/commands'
import { Menu } from '@grammyjs/menu'

import { stageLabel, personalIcon } from './line'
import { fetchStageNumbers, OPEN_TOURNAMENT_STATUSES } from './queries'
import { torneoMenu, openTournamentDetail } from './detail'
import { requireLinkedAssociate, resolveAssociateUuidByChatId } from '../account/linking'
import { registerMenu, registerBackResolver } from '../../menuNav'
import { createPerContextCache } from '../../perContextCache'
import { ICONS } from '~~/server/utils/telegram/icons'
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
  registrationStatus: 'registered' | 'checked_in'
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

  // Only the leagues this associate is registered in (see queries.ts)
  const leagueUuids = [...new Set(
    rows.map(row => row.tournament.league_uuid).filter(uuid => uuid !== null)
  )]
  const stageNumbers = await fetchStageNumbers(leagueUuids)

  return rows
    .map((row): MyRegistration => ({
      // Same normalization as queries.ts's fetchRegistrationStatuses: present means checked in or
      // registered
      registrationStatus: row.status === 'checked_in' ? 'checked_in' : 'registered',
      tournament: { ...row.tournament, stageNumber: stageNumbers.get(row.tournament.uuid) ?? null }
    }))
    .sort((a, b) => a.tournament.starts_at.localeCompare(b.tournament.starts_at))
}

// The command handler and iscrizioniMenu's .dynamic() both run fetchMyTournaments in one update:
// memoizing by ctx dedupes it. See perContextCache.ts
const memoize = createPerContextCache<{ registrations: Promise<MyRegistration[]> }>()

function cachedFetchMyTournaments(ctx: Context, associateUuid: string): Promise<MyRegistration[]> {
  return memoize(ctx, 'registrations', () => fetchMyTournaments(associateUuid))
}

// A button under each tournament, as a "buttons" block in the rich message body (not a Menu
// reply_markup), like calendario.ts; handled by a plain bot.on('callback_query:data') (see
// registerIscrizioniCommand). No origin in the payload: this list has one shape, so the uuid is
// enough.
const ISC_OPEN_PREFIX = 'iscopen:'

function encodeIscOpenPayload(uuid: string): string {
  return `${ISC_OPEN_PREFIX}${uuid}`
}

function decodeIscOpenPayload(data: string): string {
  return data.slice(ISC_OPEN_PREFIX.length)
}

function mieiTorneiBlocks(registrations: MyRegistration[]): InputRichMessage['blocks'] {
  const blocks: InputRichMessage['blocks'] = [
    { type: 'heading', size: 3, text: `${ICONS.ticket} I tuoi tornei` }
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
      text: [`${personalIcon(registrationStatus)} `, { type: 'bold', text: tournament.name }, stage]
    })
    blocks.push({ type: 'paragraph', text: `${ICONS.date} ${date}` })
    // fallow-ignore-next-line code-duplication -- leghe.ts's location/button block, other encoder
    if (tournament.location?.name) {
      blocks.push({ type: 'paragraph', text: `${ICONS.location} ${tournament.location.name}` })
    }

    blocks.push({
      type: 'buttons',
      buttons: [{ text: `${ICONS.openDetails} Apri dettagli`, callback_data: encodeIscOpenPayload(tournament.uuid) }]
    })
  }

  return blocks
}

// Exported so detail.ts's "back" button can rebuild this view. Falls back to "not linked" for a
// chat that unlinked mid-session
export async function iscrizioniBlocksFor(ctx: Context, chatId: number): Promise<InputRichMessage['blocks']> {
  const associateUuid = await resolveAssociateUuidByChatId(chatId)
  if (!associateUuid) return [{ type: 'paragraph', text: 'Devi prima collegare il tuo account.' }]

  const registrations = await cachedFetchMyTournaments(ctx, associateUuid)
  return mieiTorneiBlocks(registrations)
}

// No buttons of its own (see ISC_OPEN_PREFIX): kept so torneoMenu's send permission is installed
// (via .register()) and detail.ts's back target has a reply_markup, like calendarioMenu
export const iscrizioniMenu = new Menu<Context>('isc', {
  autoAnswer: false,
  onMenuOutdated: false
})

registerMenu('isc', iscrizioniMenu)

// Rebuilds this list for detail.ts's "back" button (a registry, see calendario.ts)
registerBackResolver('i', async (ctx, _origin, chatId) => ({
  payload: '', menu: iscrizioniMenu, text: { blocks: await iscrizioniBlocksFor(ctx, chatId) }
}))

// Handles taps on mieiTorneiBlocks's per-tournament "buttons" blocks; registered before
// bot.use(commands), own callback_data prefix
async function handleIscOpenButton(ctx: Context, next: () => Promise<void>) {
  const data = ctx.callbackQuery?.data
  if (!data?.startsWith(ISC_OPEN_PREFIX)) return next()

  const uuid = decodeIscOpenPayload(data)
  await openTournamentDetail(ctx, uuid, 'i')
}

// Extracted for reuse by t.me/<bot>?start=iscrizioni (deepLinks.ts); the web registrations page's
// "apri nel bot" button is the entry point
async function iscrizioniCommandHandler(ctx: Context) {
  try {
    const associateUuid = await requireLinkedAssociate(ctx)
    if (!associateUuid) return

    const registrations = await cachedFetchMyTournaments(ctx, associateUuid)
    const blocks = mieiTorneiBlocks(registrations)
    await ctx.replyWithRichMessage({ blocks }, { reply_markup: iscrizioniMenu })
  } catch {
    await ctx.replyWithRichMessage({
      markdown: `${ICONS.warning} Non sono riuscito a recuperare i tuoi tornei, riprova più tardi.`
    })
  }
}

registerDeepLink('iscrizioni', iscrizioniCommandHandler)

export function registerIscrizioniCommand(bot: Bot, commands: CommandGroup<Context>) {
  // Deferred to call time, see calendario.ts
  iscrizioniMenu.register(torneoMenu)
  bot.use(iscrizioniMenu)

  // Registered before bot.use(commands), like calendario.ts
  bot.on('callback_query:data', handleIscOpenButton)

  commands.command('iscrizioni', 'I tornei a cui sei iscritto', iscrizioniCommandHandler)
}
