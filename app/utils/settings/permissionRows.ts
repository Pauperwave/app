// app\utils\settings\permissionRows.ts

export type Access = 'full' | 'partial' | 'none'
export type RoleKey = 'player' | 'organizer' | 'admin' | 'superAdmin'
export type GroupKey
  = 'finance' | 'standings' | 'tournaments' | 'locations' | 'wantedCards' | 'players'
    | 'commanderDecks' | 'membership' | 'rulesets' | 'trash' | 'roles'

// Whether the row describes real, working code today, separate from the role grid (the *intended*
// policy, docs/architecture/roles.md/permissions.md). Verified by hand against server/api/* and
// app/pages/*, not derived: keep it in sync like the role columns, re-checking whenever a row's
// underlying feature is built/changed
export type ImplementationStatus = 'implemented' | 'partial' | 'notImplemented'

export interface RoleCell {
  access: Access
  /** Detail shown on hover — the per-row/per-role "why", e.g. what "partial" means
   * specifically here. Absent for most 'full' cells and always absent for 'none'
   * (nothing to explain beyond the blank cell itself). */
  note?: string
}

export interface PermissionRow {
  /** A section-header pseudo-row (one per theme, e.g. "Carte Cercate") rather
   * than a real permission — every column but `feature` is blank for these,
   * see the column cell functions below. */
  isSection?: boolean
  group: GroupKey
  feature: string
  status?: ImplementationStatus
  /** Detail shown on hover for 'partial'/'notImplemented' rows — what's
   * missing or wrong today. Absent for 'implemented' rows. */
  statusNote?: string
  /** Unauthenticated access — the public/no-login-required equivalent of a
   * feature, e.g. viewing standings via /classifiche/<format> (ADR-011,
   * docs/PROGRESS.md). Kept separate from `player` (the lowest *logged-in*
   * role) since the two aren't the same access boundary — most rows have no
   * public equivalent at all, hence optional/defaulting to 'none' like the
   * others. */
  publicAccess?: RoleCell
  player?: RoleCell
  organizer?: RoleCell
  admin?: RoleCell
  superAdmin?: RoleCell
}

type Translate = (key: string) => string
type KeyExists = (key: string) => boolean

// Grouped by domain (within each group still lowest-to-highest role), so same-domain rows (e.g. the
// four Carte Cercate rows) are consecutive. Section order follows the sidebar nav, not
// docs/architecture/permissions.md's order (see the `return` below): that file stays the source of
// truth for the "why" behind each row, this table is its in-app rendering, not a second decision.
// Keep both in sync by hand until PERMISSION_LEVEL (docs/architecture/roles.md) exists in code and
// this can compute from it
export function buildPermissionRows(t: Translate, te: KeyExists): PermissionRow[] {
  type RowKey
    // Finanze e transazioni
    = | 'viewFinance'
      // Standings
      | 'viewStandings'
      // Tournaments / leagues / events
      | 'viewTournaments' | 'registerTournament' | 'manageTournaments' | 'resetPairing'
      | 'cancelRound' | 'manageEventPayments' | 'deleteTournaments'
      // Luoghi
      | 'manageLocations'
      // Carte Cercate
      | 'viewWantedCards' | 'createWantedCard' | 'updateOwnWantedCardStatus'
      | 'deleteOwnWantedCard' | 'manageOthersWantedCards'
      // Giocatori
      | 'viewPlayers'
      // Mazzi Commander
      | 'manageOwnDecks' | 'manageAllDecks' | 'deleteCommanderDeck'
      // Anagrafica / quote associative
      | 'viewAssociates' | 'viewOwnMembership' | 'manageMembers' | 'manageMembershipFees' | 'sendPaymentReceipts'
      // Regolamenti
      | 'manageRulesets' | 'deleteRuleset'
      // Cestino
      | 'viewTrash' | 'purgeTrash'
      // Ruoli
      | 'manageRoles'
  type NoteKey = 'publicNote' | 'playerNote' | 'organizerNote' | 'adminNote' | 'superAdminNote'

  // 'full'/'none' shorthand for the common case (no note); pass [key, noteKey] for
  // a cell that needs one — te() checks the key exists first, since most rows don't
  // define all four *Note keys and t() on a missing key just echoes the key back.
  type CellSpec = Access | [Access, NoteKey]
  const cell = (key: RowKey, spec: CellSpec): RoleCell => {
    if (typeof spec === 'string') return { access: spec }
    const [access, noteKey] = spec
    const path = `settings.permissions.rows.${key}.${noteKey}`
    return { access, note: te(path) ? t(path) : undefined }
  }

  const row = (
    key: RowKey,
    status: ImplementationStatus,
    access: [CellSpec, CellSpec, CellSpec, CellSpec],
    // Defaults to 'none' — most rows have no unauthenticated equivalent at
    // all, only pass this for the handful that do (e.g. viewStandings).
    publicAccess: CellSpec = 'none'
  ): Omit<PermissionRow, 'group'> => {
    const [player, organizer, admin, superAdmin] = access
    const statusNotePath = `settings.permissions.rows.${key}.statusNote`
    return {
      feature: t(`settings.permissions.rows.${key}.feature`),
      status,
      statusNote: te(statusNotePath) ? t(statusNotePath) : undefined,
      publicAccess: cell(key, publicAccess),
      player: cell(key, player),
      organizer: cell(key, organizer),
      admin: cell(key, admin),
      superAdmin: cell(key, superAdmin)
    }
  }

  // A section-header pseudo-row (bold feature text, every other column blank, see the column cell
  // functions below) plus tagging every row of the following block with its theme (e.g. "Carte
  // Cercate"). One table, not one per section: separate <table>s wouldn't share a <colgroup>, so
  // the "feature" column's shrink-to-fit width (see its comment below) would reflow per section
  // instead of lining up down the page
  const group = (key: GroupKey, items: Omit<PermissionRow, 'group'>[]): PermissionRow[] => [
    { isSection: true, group: key, feature: t(`settings.permissions.groups.${key}`) },
    ...items.map(item => ({ ...item, group: key }))
  ]

  // Section order follows the sidebar nav (useMainNavGroups.ts), not
  // docs/architecture/permissions.md's: Dashboards (Finanze) → Community (Associati/Richieste,
  // Giocatori, Carte Cercate) → Competizioni (Tornei/Leghe/Eventi, Luoghi, Regolamenti last) →
  // Classifiche → Commander (Mazzi Commander) → Impostazioni (Membri → roles, Cestino last).
  //
  // viewFinance/viewAssociates/viewPlayers/manageLocations/manageRulesets were once notImplemented:
  // none of their pages declared `definePageMeta({ permission: ... })`, only the sidebar hid the
  // link, so any authenticated user could open them by URL. All five (plus viewTrash, already
  // guarded) are implemented now
  return [
    ...group('finance', [
      row('viewFinance', 'implemented', ['none', 'full', 'full', 'full'])
    ]),

    ...group('membership', [
      row('viewAssociates', 'implemented', ['none', 'full', 'full', 'full']),
      row('viewOwnMembership', 'implemented', [
        ['partial', 'playerNote'], ['partial', 'organizerNote'], ['full', 'adminNote'], ['full', 'superAdminNote']
      ]),
      row('manageMembers', 'implemented', ['none', 'none', 'full', 'full']),
      row('manageMembershipFees', 'implemented', ['none', 'none', 'full', 'full']),
      row('sendPaymentReceipts', 'notImplemented', ['none', 'none', 'full', 'full'])
    ]),

    ...group('players', [
      row('viewPlayers', 'implemented', ['none', 'full', 'full', 'full'])
    ]),

    ...group('wantedCards', [
      row('viewWantedCards', 'implemented', ['full', 'full', 'full', 'full']),
      row('createWantedCard', 'implemented', [['partial', 'playerNote'], 'full', 'full', 'full']),
      row('updateOwnWantedCardStatus', 'partial', [['partial', 'playerNote'], 'full', 'full', 'full']),
      row('deleteOwnWantedCard', 'implemented', ['none', 'full', 'full', 'full']),
      row('manageOthersWantedCards', 'implemented', ['none', 'full', 'full', 'full'])
    ]),

    ...group('tournaments', [
      row('viewTournaments', 'implemented', ['full', 'full', 'full', 'full'], ['partial', 'publicNote']),
      row('registerTournament', 'notImplemented', [['partial', 'playerNote'], 'full', 'full', 'full']),
      row('manageTournaments', 'implemented', ['none', 'full', 'full', 'full']),
      row('resetPairing', 'notImplemented', ['none', 'full', 'full', 'full']),
      row('cancelRound', 'notImplemented', ['none', 'none', 'full', 'full']),
      row('manageEventPayments', 'implemented', ['none', 'full', 'full', 'full']),
      row('deleteTournaments', 'implemented', ['none', 'none', 'none', 'full'])
    ]),

    ...group('locations', [
      row('manageLocations', 'implemented', ['none', 'full', 'full', 'full'])
    ]),

    ...group('rulesets', [
      row('manageRulesets', 'implemented', ['none', 'full', 'full', 'full']),
      row('deleteRuleset', 'notImplemented', ['none', 'none', 'full', 'full'])
    ]),

    ...group('standings', [
      row('viewStandings', 'implemented', ['full', 'full', 'full', 'full'], 'full')
    ]),

    ...group('commanderDecks', [
      row('manageOwnDecks', 'notImplemented', ['full', 'full', 'full', 'full']),
      row('manageAllDecks', 'notImplemented', ['none', 'none', 'full', 'full']),
      row('deleteCommanderDeck', 'notImplemented', ['none', 'none', 'full', 'full'])
    ]),

    ...group('roles', [
      row('manageRoles', 'implemented', ['none', 'none', ['partial', 'adminNote'], 'full'])
    ]),

    ...group('trash', [
      row('viewTrash', 'implemented', ['none', 'none', 'full', 'full']),
      row('purgeTrash', 'implemented', ['none', 'none', 'none', 'full'])
    ])
  ]
}
