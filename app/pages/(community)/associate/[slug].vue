<!-- app\pages\(community)\associate\[slug].vue -->
<script setup lang="ts">
// fallow-ignore-file code-duplication -- the UDashboardPanel navbar/toolbar/breadcrumb
// header skeleton mirrors other detail pages (events/leagues/tournaments); these are
// still mock-data pages, expected to change dramatically once real functionality lands
import { format, parseISO } from 'date-fns'
import type { TableColumn } from '@nuxt/ui'
import type { Transaction } from '~/types'
import { UBadge, UButton, UIcon, UTooltip } from '#components'
import AssociateTag from '~/components/ui/AssociateTag.vue'
import DateWithRelativeTooltip from '~/components/ui/DateWithRelativeTooltip.vue'
import PaymentTypeBadge from '~/components/ui/PaymentTypeBadge.vue'
import PaymentMethodBadge from '~/components/ui/PaymentMethodBadge.vue'
import TournamentsStageLabel from '~/components/tournaments/StageLabel.vue'

interface DetailField {
  icon: string
  label: string
  value: string
}

interface ConsentField {
  icon: string
  label: string
  value: boolean
}

const route = useRoute()
const { t } = useI18n()
const { data: associates, isLoading: loading } = useAssociatesQuery()
const { breadcrumbItems } = useBreadcrumbs()

const associate = computed(() => (associates.value ?? [])
  .find(item => slugify(`${item.first_name} ${item.last_name}`) === route.params.slug))

// Reverse direction of players/[playerId]/index.vue's own "Vedi la scheda
// associato" link (2026-08-20 user request) — not every associate has a
// linked player row (players are created on first tesseramento-adjacent
// login, not at signup), so this can legitimately be null.
const { data: players } = usePlayersQuery()
const player = computed(() => players.value?.find(
  item => item.associate_uuid === associate.value?.uuid) ?? null)

const { data: membershipEvents, isLoading: membershipEventsLoading }
  = useAssociateMembershipEventsQuery(() => associate.value?.uuid)

useSeoMeta({
  title: () => associate.value
    ? `${associate.value.first_name} ${associate.value.last_name}`
    : t('associate.breadcrumb')
})

const editModalOpen = ref(false)

// Emanuele Nardi gets his real GitHub avatar (same one hardcoded in
// UserMenu.vue) instead of the generated placeholder.
const avatar = computed(() => {
  if (!associate.value) return undefined
  if (associate.value.first_name === 'Emanuele' && associate.value.last_name === 'Nardi') {
    return 'https://github.com/emanuelenardi.png'
  }
  return generatePlayerAvatar(associate.value.id)
})

function formatDate(dateString?: string | null): string {
  if (!dateString) return ''
  try {
    return format(parseISO(dateString), 'dd/MM/yyyy')
  } catch {
    return ''
  }
}

const anagraficaFields = computed<DetailField[]>(() => !associate.value
  ? []
  : [
    { icon: ICONS.player, label: t('associate.columns.firstName'), value: associate.value.first_name },
    { icon: ICONS.player, label: t('associate.columns.lastName'), value: associate.value.last_name },
    { icon: ICONS.idCard, label: t('associate.columns.taxCode'), value: associate.value.tax_code || '—' },
    { icon: 'i-lucide-cake', label: t('associate.columns.bornDate'), value: formatDate(associate.value.born_date) || '—' },
    { icon: ICONS.mapPin, label: t('associate.columns.bornLocation'), value: associate.value.born_location || '—' },
    { icon: 'i-lucide-map', label: t('associate.columns.bornProvince'), value: associate.value.born_province || '—' },
    { icon: 'i-lucide-flag', label: t('associate.columns.bornState'), value: associate.value.born_state || '—' }
  ])

const contattiFields = computed<DetailField[]>(() => !associate.value
  ? []
  : [
    { icon: ICONS.mail, label: t('associate.columns.emailAddress'), value: associate.value.email_address },
    // Same formatting as the table's phoneNumberColumn (formatPhoneNumber.ts)
    // — the raw column stores E.164 ("+393203522674"), unreadable as-is.
    { icon: ICONS.phone, label: t('associate.columns.phoneNumber'), value: formatPhoneNumber(associate.value.phone_number) || '—' },
    { icon: ICONS.mapPin, label: t('associate.columns.residencyAddress'), value: associate.value.residency_address },
    { icon: ICONS.hash, label: t('associate.columns.residencyHouseNumber'), value: associate.value.residency_house_number || '—' },
    { icon: 'i-lucide-building', label: t('associate.columns.residencyCity'), value: associate.value.residency_city },
    { icon: 'i-lucide-map', label: t('associate.columns.residencyProvince'), value: associate.value.residency_province },
    { icon: 'i-lucide-mailbox', label: t('associate.columns.residencyCap'), value: associate.value.residency_cap }
  ])

// pauperwave_associate_number/membership_status/associate_type don't go
// through this list — all three render as their real badge component
// (AssociateNumberBadge/MembershipStatusBadge/AssociateTypeBadge) in the
// card's #before slot instead of plain translated text, same as the table
// (bug, user report 2026-08-27: associate_type was the odd one out, still
// plain text here despite the other two already being badges).
const tesseramentoFields = computed<DetailField[]>(() => !associate.value
  ? []
  : [
    { icon: ICONS.calendar, label: t('associate.columns.requestDate'), value: formatDate(associate.value.request_date) || '—' },
    { icon: 'i-lucide-calendar-check', label: t('associate.columns.associationDate'), value: formatDate(associate.value.association_date) || '—' },
    { icon: ICONS.creditCard, label: t('associate.columns.lastRenewalDate'), value: formatDate(associate.value.latest_renewal_date) || '—' }
  ])

// Boolean values, not yes/no strings — rendered via <ConsentBadge>, the same
// component now used by the table's consent_data/consent_social/
// has_read_statute/has_acknowledged_surveillance_notice columns
// (useAssociatesTableColumns.ts, associates/index.vue).
const consensiFields = computed<ConsentField[]>(() => !associate.value
  ? []
  : [
    { icon: 'i-lucide-shield-check', label: t('associate.columns.consentData'), value: associate.value.consent_data },
    { icon: 'i-lucide-share-2', label: t('associate.columns.consentSocial'), value: associate.value.consent_social },
    { icon: ICONS.rules, label: t('associate.columns.hasReadStatute'), value: associate.value.has_read_statute },
    { icon: ICONS.show, label: t('associate.columns.hasAcknowledgedSurveillanceNotice'), value: associate.value.has_acknowledged_surveillance_notice }
  ])

// Transactions history, filtered client-side out of the same cached query
// /transactions itself uses — no dedicated per-associate endpoint, the whole
// table is already fetched and small enough (same reasoning as
// useAssociatesTableColumns.ts resolving updated_by/created_by client-side).
const {
  data: transactions, isLoading: transactionsLoading, isPending: transactionsPending
} = useTransactionsQuery()
const associateTransactions = computed(() => (transactions.value ?? [])
  .filter(transaction => transaction.associate?.uuid === associate.value?.uuid))

const amountFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

// Same league-relative stage numbering /transactions and /tournaments show
// (assignTournamentStageNumbers) — reused here rather than re-derived, and
// deduped against the 'tournaments' key by Pinia Colada if either page is
// already open.
const { data: allTournaments } = useTournamentsQuery()
const tournamentsByUuid = computed(() =>
  new Map((allTournaments.value ?? []).map(tournament => [tournament.uuid, tournament])))

// Read-only summary, not the full /transactions table columns
// (useTransactionsTableColumns.ts) — no selection/grouping/row-actions here,
// this is a per-associate history embedded in a bigger detail page, not a
// management surface of its own. event_name/gettoni cells DO reuse that
// table's own rendering logic though (2026-08-25 fix) — this had drifted
// into just dumping row.original.event_name as raw text, which for
// historical imports meant literally showing strings like "PAUPER TAPPA 6"
// instead of the resolved tournament + stage number, and never splitting
// out gettoni-encoded rows into their own badge at all.
const associateTransactionsColumns: TableColumn<Transaction>[] = [
  {
    accessorKey: 'payment_date',
    header: t('transaction.columns.paymentDate'),
    meta: { class: { td: 'whitespace-nowrap font-mono' } },
    cell: ({ row }) => h(DateWithRelativeTooltip, { isoString: row.original.payment_date })
  },
  {
    accessorKey: 'payment_type',
    header: t('transaction.columns.paymentType'),
    meta: { class: { td: 'whitespace-nowrap' } },
    cell: ({ row }) => h(PaymentTypeBadge, { type: row.original.payment_type })
  },
  {
    accessorKey: 'payment_amount',
    header: t('transaction.columns.paymentAmount'),
    meta: { class: { td: 'whitespace-nowrap font-mono' } },
    cell: ({ row }) => amountFormatter.format(row.original.payment_amount)
  },
  {
    accessorKey: 'payment_method',
    header: t('transaction.columns.paymentMethod'),
    meta: { class: { td: 'whitespace-nowrap' } },
    cell: ({ row }) => h(PaymentMethodBadge, { method: row.original.payment_method })
  },
  {
    accessorKey: 'received_by',
    header: t('transaction.columns.receivedBy'),
    meta: { class: { td: 'whitespace-nowrap' } },
    cell: ({ row }) => h(AssociateTag, { name: row.original.received_by })
  },
  {
    accessorKey: 'event_name',
    header: t('transaction.columns.event'),
    cell: ({ row }) => {
      // tournament/event checked first, ahead of event_name's own raw text:
      // for Token Purchase rows event_name is just "8 gettoni" (see
      // transactionGettoni.ts), never a real name — same fix as
      // useTransactionsTableColumns.ts's own event_name cell (2026-08-27).
      const { tournament, event } = row.original
      if (tournament) {
        // Real tournament.name + its league-relative stage number, not the
        // historical import's raw event_name text (e.g. "PAUPER TAPPA 6").
        const stageNumber = tournamentsByUuid.value.get(tournament.uuid)?.stageNumber
        return h(UButton, {
          to: tournamentDetailUrl(tournament),
          icon: PAYMENT_TYPE_BADGE_CONFIG['Tournament Fee'].icon,
          size: 'xs',
          color: 'neutral',
          variant: 'subtle'
        }, () => [
          tournament.name,
          stageNumber ? h(TournamentsStageLabel, { number: stageNumber, class: '!text-xs' }) : null
        ])
      }
      // event is guaranteed set here by ck_payment_type_event_link whenever
      // tournament isn't — this `if` is TS narrowing, not a real fallback
      // branch (the constraint rules out neither being set).
      if (event) {
        return h(UButton, {
          to: `/events/${event.uuid}`,
          label: event.name,
          icon: PAYMENT_TYPE_BADGE_CONFIG['Event Fee'].icon,
          size: 'xs',
          color: 'neutral',
          variant: 'subtle'
        })
      }
      return null
    }
  },
  {
    id: 'league',
    // Only ever set for a Tournament Fee row whose tournament belongs to a
    // league (a tournament's league is optional/polymorphic, see the
    // project's own routing convention) — resolved the same way stageNumber
    // above is, off tournamentsByUuid rather than the transaction's own
    // embedded tournament sub-object, which only carries leagueUuid, not
    // the resolved name (user request, 2026-08-27).
    accessorFn: (row) => {
      const uuid = row.tournament?.uuid
      return uuid ? tournamentsByUuid.value.get(uuid)?.league ?? null : null
    },
    header: t('transaction.columns.league'),
    cell: ({ row }) => {
      const tournament = row.original.tournament
      if (!tournament) return null
      const fullTournament = tournamentsByUuid.value.get(tournament.uuid)
      if (!fullTournament?.leagueUuid) return null
      return h(UButton, {
        to: `/leagues/${fullTournament.leagueUuid}`,
        label: fullTournament.league ?? undefined,
        size: 'xs',
        color: 'neutral',
        variant: 'subtle'
      })
    }
  },
  {
    id: 'gettoni',
    accessorFn: row => parseGettoniCount(row.event_name),
    header: t('transaction.columns.gettoni'),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ getValue }) => {
      const count = getValue<number | null>()
      if (count === null) return null
      return h(UBadge, { variant: 'subtle', color: 'warning', icon: ICONS.coins, label: String(count) })
    }
  },
  {
    accessorKey: 'receipt_ref',
    header: t('transaction.columns.receipt'),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => {
      const receiptRef = row.original.receipt_ref
      if (!receiptRef) return null
      return h(UBadge, { variant: 'subtle', color: 'neutral', icon: ICONS.receipt, label: receiptRef })
    }
  },
  {
    accessorKey: 'notes',
    header: t('transaction.columns.notes'),
    // parseTransactionNotes() only handles the unknown-email marker now —
    // the receipt number moved to its own receipt_ref column (migration
    // 20260825230000), read directly above instead of parsed out of notes.
    cell: ({ row }) => {
      const { hasUnknownEmail, cleanNotes } = parseTransactionNotes(row.original.notes)
      if (!hasUnknownEmail) return cleanNotes
      return h('div', { class: 'flex items-center gap-1.5' }, [
        h(UTooltip, { text: t('transaction.columns.unknownEmailTooltip') }, () => h(UIcon, {
          name: ICONS.incognito,
          class: 'size-4 text-dimmed shrink-0'
        })),
        cleanNotes
      ])
    }
  }
]
</script>

<template>
  <!-- fallow-ignore-file code-duplication -- see the top-of-file comment -->
  <UDashboardPanel id="associate-detail">
    <template #header>
      <UDashboardNavbar
        :title="associate
          ? `${associate.first_name} ${associate.last_name}`
          : t('associate.breadcrumb')"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            v-if="associate"
            :label="$t('associate.editModal.openButton')"
            :icon="ICONS.edit"
            color="neutral"
            variant="outline"
            @click="editModalOpen = true"
          />

          <USeparator orientation="vertical" class="h-4" />

          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" class="ms-2" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="loading" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-circle" class="animate-spin text-3xl text-muted" />
      </div>

      <div v-else-if="!associate" class="text-center py-12 text-muted">
        {{ $t('associate.detail.notFound') }}
      </div>

      <div v-else class="flex flex-col gap-4">
        <UCard>
          <div class="flex flex-wrap items-center gap-4">
            <UAvatar
              :src="avatar"
              :alt="`${associate.first_name} ${associate.last_name}`"
              size="3xl"
              :ui="{ root: 'size-24', fallback: 'text-2xl' }"
            />
            <div class="flex-1 min-w-0">
              <h2 class="text-xl font-semibold truncate">
                {{ associate.first_name }} {{ associate.last_name }}
              </h2>
              <div class="flex flex-wrap items-center gap-1.5 mt-1.5">
                <MembershipStatusBadge :status="associate.membership_status" />
                <AssociateNumberBadge :number="associate.pauperwave_associate_number" />
                <AssociateTypeBadge :type="associate.associate_type" />
              </div>

              <NuxtLink
                v-if="player?.first_name && player?.last_name"
                :to="`/players/${slugify(`${player.first_name} ${player.last_name}`)}`"
                class="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1.5"
              >
                <UIcon :name="ICONS.gameplay" class="size-4" />
                {{ $t('associate.detail.viewPlayerProfile') }}
              </NuxtLink>
            </div>
          </div>
        </UCard>

        <div class="grid gap-4 sm:grid-cols-2">
          <DetailCard
            :title="$t('associate.detail.sections.anagrafica')"
            :fields="anagraficaFields"
          />

          <DetailCard
            :title="$t('associate.detail.sections.contatti')"
            :fields="contattiFields"
          />

          <DetailCard
            :title="$t('associate.detail.sections.tesseramento')"
            :fields="tesseramentoFields"
          >
            <template #before>
              <div class="flex justify-between items-center gap-4">
                <dt class="flex items-center gap-1.5 text-muted">
                  <UIcon name="i-lucide-badge-check" class="size-4 shrink-0" /> {{ $t('associate.columns.membershipStatus') }}
                </dt>
                <dd>
                  <MembershipStatusBadge :status="associate.membership_status" />
                </dd>
              </div>
              <div class="flex justify-between items-center gap-4">
                <dt class="flex items-center gap-1.5 text-muted">
                  <UIcon :name="ICONS.idCard" class="size-4 shrink-0" /> {{ $t('associate.columns.pauperwaveAssociateNumber') }}
                </dt>
                <dd>
                  <AssociateNumberBadge :number="associate.pauperwave_associate_number" />
                </dd>
              </div>
              <div class="flex justify-between items-center gap-4">
                <dt class="flex items-center gap-1.5 text-muted">
                  <UIcon name="i-lucide-tag" class="size-4 shrink-0" /> {{ $t('associate.columns.associateType') }}
                </dt>
                <dd>
                  <AssociateTypeBadge :type="associate.associate_type" />
                </dd>
              </div>
            </template>
          </DetailCard>

          <DetailCard
            :title="$t('associate.detail.sections.consensi')"
            :fields="[]"
          >
            <template #before>
              <div v-for="field in consensiFields" :key="field.label" class="flex justify-between items-center gap-4">
                <dt class="flex items-center gap-1.5 text-muted">
                  <UIcon :name="field.icon" class="size-4 shrink-0" /> {{ field.label }}
                </dt>
                <dd>
                  <ConsentBadge :value="field.value" />
                </dd>
              </div>
            </template>
          </DetailCard>
        </div>

        <UCard :ui="{ header: 'font-semibold' }">
          <template #header>
            {{ $t('associate.detail.sections.membershipHistory') }}
          </template>

          <USkeleton v-if="membershipEventsLoading" class="h-24 w-full" />
          <AssociatesSingleMembershipTimeline v-else :events="membershipEvents ?? []" />
        </UCard>

        <UCard :ui="{ header: 'font-semibold' }">
          <template #header>
            {{ $t('associate.detail.sections.transactions') }}
          </template>

          <ListSkeleton v-if="transactionsPending" :columns="associateTransactionsColumns.length" />
          <p v-else-if="!associateTransactions.length" class="text-sm text-muted py-4 text-center">
            {{ $t('associate.detail.transactionsEmpty') }}
          </p>
          <UTable
            v-else
            :data="associateTransactions"
            :columns="associateTransactionsColumns"
            :loading="transactionsLoading"
          />
        </UCard>
      </div>
    </template>
  </UDashboardPanel>

  <AssociatesListEditModal v-model="editModalOpen" :associate="associate ?? null" />
</template>
