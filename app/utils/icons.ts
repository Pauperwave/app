// app\utils\icons.ts

/**
 * Single source of truth for every icon used in the app. Check here before
 * picking an icon for a new usage — reuse an existing constant if the
 * concept already exists, rather than introducing a second icon for the
 * same idea. Mirrors the pattern established in MagicTheGathering/league.
 *
 * Not yet adopted everywhere: populated from icons already used across the
 * app, migrated in app/layouts/default.vue as the first consumer. Other
 * files should switch to ICONS.* the next time they're touched, rather
 * than a single big-bang replacement (see docs/TODO.md).
 */
export const ICONS = {
  // Actions
  add: 'i-lucide-plus',
  addCircle: 'i-lucide-circle-plus',
  delete: 'i-lucide-trash',
  edit: 'i-lucide-pencil-line',
  confirm: 'i-lucide-check',
  copy: 'i-lucide-copy',
  share: 'i-lucide-share-2',
  link: 'i-lucide-link',
  close: 'i-lucide-x',
  statusRejected: 'i-lucide-x-circle',
  clear: 'i-lucide-circle-x',
  refresh: 'i-lucide-refresh-cw',
  shuffle: 'i-lucide-shuffle',
  dragHandle: 'i-lucide-grip-vertical',
  undo: 'i-lucide-undo-2',
  search: 'i-lucide-search',
  filter: 'i-lucide-filter',
  filterClear: 'i-lucide-filter-x',
  settings: 'i-lucide-settings',
  settingsColumns: 'i-lucide-settings-2',
  settingsGear: 'i-lucide-settings',
  logout: 'i-lucide-log-out',
  lock: 'i-lucide-lock',
  security: 'i-lucide-shield',
  permissions: 'i-lucide-key-round',
  globe: 'i-lucide-globe',

  // Status / feedback
  success: 'i-lucide-check-circle',
  successFilled: 'i-lucide-circle-check',
  successFilledBig: 'i-lucide-circle-check-big',
  help: 'i-lucide-help-circle',
  loading: 'i-lucide-loader-2',
  pending: 'i-lucide-circle-dot-dashed',
  banned: 'i-lucide-ban',
  warning: 'i-lucide-alert-triangle',
  list: 'i-lucide-list',

  // People
  players: 'i-lucide-users',
  playersRound: 'i-lucide-users-round',
  player: 'i-lucide-user',
  addPlayer: 'i-lucide-user-plus',
  playerConfirmed: 'i-lucide-user-check',
  playerLapsed: 'i-lucide-user-x',
  noShow: 'i-lucide-user-x',

  // Visibility
  show: 'i-lucide-eye',
  hide: 'i-lucide-eye-off',

  // Navigation
  home: 'i-lucide-house',
  chevronDown: 'i-lucide-chevron-down',
  chevronLeft: 'i-lucide-chevron-left',
  chevronRight: 'i-lucide-chevron-right',
  chevronsLeft: 'i-lucide-chevrons-left',
  chevronsRight: 'i-lucide-chevrons-right',
  chevronsUpDown: 'i-lucide-chevrons-up-down',
  ellipsisVertical: 'i-lucide-ellipsis-vertical',
  bookOpen: 'i-lucide-book-open',
  keyboard: 'i-lucide-keyboard',
  inbox: 'i-lucide-inbox',

  // Sorting
  sortAscNumeric: 'i-lucide-arrow-up-narrow-wide',
  sortDescNumeric: 'i-lucide-arrow-down-wide-narrow',
  sortBoth: 'i-lucide-arrow-up-down',

  // Calendar / time
  calendar: 'i-lucide-calendar',
  calendarAdd: 'i-lucide-calendar-plus',
  calendarRenew: 'i-lucide-calendar-arrow-up',
  calendarView: 'i-lucide-calendar-days',
  clock: 'i-lucide-clock',
  timer: 'i-lucide-timer',
  pauseCircle: 'i-lucide-pause-circle',
  history: 'i-lucide-history',
  cake: 'i-lucide-cake',
  trendingUp: 'i-lucide-trending-up',

  // Theme
  lightMode: 'i-lucide-sun',
  darkMode: 'i-lucide-moon',
  themeAuto: 'i-lucide-sun-moon',
  palette: 'i-lucide-palette',

  // Commander / MTG domain
  commander: 'i-lucide-shield-half',
  crown: 'i-lucide-crown',
  rules: 'i-lucide-scroll-text',
  battle: 'i-lucide-swords',
  layers: 'i-lucide-layers',
  gameplay: 'i-lucide-gamepad-2',
  cardSearch: 'i-lucide-scan-search',

  // League / event / scoring
  standings: 'i-lucide-trophy',
  medal: 'i-lucide-medal',
  chartPie: 'i-lucide-chart-pie',
  hash: 'i-lucide-hash',

  // Payments
  wallet: 'i-lucide-wallet',
  euro: 'i-lucide-euro',
  badgeEuro: 'i-lucide-badge-euro',
  coins: 'i-lucide-coins',
  creditCard: 'i-lucide-credit-card',
  shoppingCart: 'i-lucide-shopping-cart',
  ticket: 'i-lucide-ticket',
  idCard: 'i-lucide-id-card',
  // "No payment on record yet" (unpaid membership status) — distinct from
  // creditCard (renewal date) and idCard (membership number), so the three
  // don't visually collide on the same badge row.
  receipt: 'i-lucide-receipt',
  // Flags a payer's email as unknown/placeholder (historical import backfill)
  incognito: 'i-lucide-hat-glasses',

  // Contact / identity fields
  mail: 'i-lucide-mail',
  atSign: 'i-lucide-at-sign',
  phone: 'i-lucide-phone',
  smartphone: 'i-lucide-smartphone',
  mapPin: 'i-lucide-map-pin',
  mapPinPlus: 'i-lucide-map-pin-plus',
  heartHandshake: 'i-lucide-heart-handshake',

  // Misc UI
  bell: 'i-lucide-bell',
  info: 'i-lucide-info',
  messageCircle: 'i-lucide-message-circle',
  alignLeft: 'i-lucide-align-left',
  image: 'i-lucide-image',
  imageOff: 'i-lucide-image-off',
  externalLink: 'i-lucide-arrow-up-right',
  github: 'i-simple-icons-github',

  // Social
  facebook: 'i-simple-icons-facebook',
  instagram: 'i-simple-icons-instagram',
  telegram: 'i-simple-icons-telegram',
  whatsapp: 'i-simple-icons-whatsapp'
} as const

export type IconName = (typeof ICONS)[keyof typeof ICONS]
