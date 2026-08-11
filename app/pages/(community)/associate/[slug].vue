<!-- app\pages\(community)\associate\[slug].vue -->
<script setup lang="ts">
// fallow-ignore-file code-duplication -- the UDashboardPanel navbar/toolbar/breadcrumb
// header skeleton mirrors other detail pages (events/leagues/tournaments); these are
// still mock-data pages, expected to change dramatically once real functionality lands
import { upperFirst } from 'scule'
import { format, parseISO } from 'date-fns'

interface DetailField {
  icon: string
  label: string
  value: string
}

const route = useRoute()
const { t } = useI18n()
const { data: associates, isLoading: loading } = useAssociatesQuery()
const { breadcrumbItems } = useBreadcrumbs()

const associate = computed(() => (associates.value ?? [])
  .find(item => slugify(`${item.first_name} ${item.last_name}`) === route.params.slug))

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

function yesNo(value: boolean): string {
  return value ? t('common.yes') : t('common.no')
}

const currentStatusBadge = computed(() => associate.value
  ? MEMBERSHIP_STATUS_BADGE_CONFIG[associate.value.membership_status] ?? { color: 'neutral' as const, icon: ICONS.help }
  : { color: 'neutral' as const, icon: ICONS.help })

const anagraficaFields = computed<DetailField[]>(() => !associate.value
  ? []
  : [
    { icon: ICONS.player, label: t('associate.columns.firstName'), value: associate.value.first_name },
    { icon: ICONS.player, label: t('associate.columns.lastName'), value: associate.value.last_name },
    { icon: 'i-lucide-id-card', label: t('associate.columns.taxCode'), value: associate.value.tax_code || '—' },
    { icon: 'i-lucide-cake', label: t('associate.columns.bornDate'), value: formatDate(associate.value.born_date) || '—' },
    { icon: ICONS.mapPin, label: t('associate.columns.bornLocation'), value: associate.value.born_location || '—' },
    { icon: 'i-lucide-map', label: t('associate.columns.bornProvince'), value: associate.value.born_province || '—' },
    { icon: 'i-lucide-flag', label: t('associate.columns.bornState'), value: associate.value.born_state || '—' }
  ])

const contattiFields = computed<DetailField[]>(() => !associate.value
  ? []
  : [
    { icon: ICONS.mail, label: t('associate.columns.emailAddress'), value: associate.value.email_address },
    { icon: ICONS.phone, label: t('associate.columns.phoneNumber'), value: associate.value.phone_number || '—' },
    { icon: ICONS.mapPin, label: t('associate.columns.residencyAddress'), value: associate.value.residency_address },
    { icon: ICONS.hash, label: t('associate.columns.residencyHouseNumber'), value: associate.value.residency_house_number || '—' },
    { icon: 'i-lucide-building', label: t('associate.columns.residencyCity'), value: associate.value.residency_city },
    { icon: 'i-lucide-map', label: t('associate.columns.residencyProvince'), value: associate.value.residency_province },
    { icon: 'i-lucide-mailbox', label: t('associate.columns.residencyCap'), value: associate.value.residency_cap }
  ])

const tesseramentoFields = computed<DetailField[]>(() => !associate.value
  ? []
  : [
    { icon: 'i-lucide-id-card', label: t('associate.columns.pauperwaveAssociateNumber'), value: associate.value.pauperwave_associate_number || '—' },
    { icon: 'i-lucide-tag', label: t('associate.columns.associateType'), value: associate.value.associate_type || '—' },
    { icon: ICONS.calendar, label: t('associate.columns.requestDate'), value: formatDate(associate.value.request_date) || '—' },
    { icon: ICONS.creditCard, label: t('associate.columns.paymentDate'), value: formatDate(associate.value.payment_date) || '—' },
    { icon: 'i-lucide-calendar-check', label: t('associate.columns.associationDate'), value: formatDate(associate.value.association_date) || '—' }
  ])

const consensiFields = computed<DetailField[]>(() => !associate.value
  ? []
  : [
    { icon: 'i-lucide-shield-check', label: t('associate.columns.consentData'), value: yesNo(associate.value.consent_data) },
    { icon: 'i-lucide-share-2', label: t('associate.columns.consentSocial'), value: yesNo(associate.value.consent_social) },
    { icon: ICONS.rules, label: t('associate.columns.hasReadStatute'), value: yesNo(associate.value.has_read_statute) },
    { icon: ICONS.show, label: t('associate.columns.hasAcknowledgedSurveillanceNotice'), value: yesNo(associate.value.has_acknowledged_surveillance_notice) }
  ])

const mtgFields = computed<DetailField[]>(() => !associate.value
  ? []
  : [
    ...(associate.value.mtgo_nickname ? [{ icon: ICONS.gameplay, label: t('associate.columns.mtgoNickname'), value: associate.value.mtgo_nickname }] : []),
    ...(associate.value.mtga_nickname ? [{ icon: ICONS.gameplay, label: t('associate.columns.mtgaNickname'), value: associate.value.mtga_nickname }] : [])
  ])
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
                <UBadge
                  variant="subtle"
                  class="capitalize gap-4"
                  v-bind="currentStatusBadge"
                >
                  {{ upperFirst(associate.membership_status.replace('_', ' ')) }}
                </UBadge>
                <UBadge
                  v-if="associate.pauperwave_associate_number"
                  color="neutral"
                  variant="subtle"
                  icon="i-lucide-id-card"
                >
                  {{ associate.pauperwave_associate_number }}
                </UBadge>
                <UBadge
                  v-if="associate.associate_type"
                  color="neutral"
                  variant="subtle"
                  class="capitalize"
                >
                  {{ associate.associate_type }}
                </UBadge>
              </div>
            </div>
          </div>
        </UCard>

        <div class="grid gap-4 sm:grid-cols-2">
          <AssociatesDetailCard
            :title="$t('associate.detail.sections.anagrafica')"
            :fields="anagraficaFields"
          />

          <AssociatesDetailCard
            :title="$t('associate.detail.sections.contatti')"
            :fields="contattiFields"
          />

          <AssociatesDetailCard
            :title="$t('associate.detail.sections.tesseramento')"
            :fields="tesseramentoFields"
          >
            <template #before>
              <div class="flex justify-between items-center gap-4">
                <dt class="flex items-center gap-1.5 text-muted">
                  <UIcon name="i-lucide-badge-check" class="size-4 shrink-0" /> {{ $t('associate.columns.membershipStatus') }}
                </dt>
                <dd>
                  <UBadge
                    variant="subtle"
                    class="capitalize gap-1.5"
                    v-bind="currentStatusBadge"
                  >
                    {{ upperFirst(associate.membership_status.replace('_', ' ')) }}
                  </UBadge>
                </dd>
              </div>
            </template>
          </AssociatesDetailCard>

          <AssociatesDetailCard
            :title="$t('associate.detail.sections.consensi')"
            :fields="consensiFields"
          />

          <AssociatesDetailCard
            v-if="mtgFields.length"
            :title="$t('associate.detail.sections.mtg')"
            :fields="mtgFields"
            value-class="font-mono"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
