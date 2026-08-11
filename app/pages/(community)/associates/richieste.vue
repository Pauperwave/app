<!-- app\pages\(community)\associates\richieste.vue -->
<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { Column } from '@tanstack/vue-table'
import { upperFirst } from 'scule'
import type { Associate } from '~/types'

const { data: associates, isLoading: loading, refetch } = useAssociatesQuery()
const { t } = useI18n()
const { isModalOpen } = useModalOpenFromQuery()
const {
  formatDateTime, formatDate, renderAssociateTypeBadge, renderConsentBadge
} = useAssociateRenderers()

// The other half of the 2026-08-11 UX split (see associates/index.vue) —
// everyone NOT yet approved: the triage queue an admin actually needs to act
// on, kept out of the roster entirely instead of buried in a status filter.
const requestAssociates = computed(() => (associates.value ?? []).filter(
  associate => associate.membership_request_status !== 'approved'
))
const pendingCount = computed(() => (associates.value ?? []).filter(
  associate => associate.membership_request_status === 'pending'
).length)

const route = useRoute()
const router = useRouter()

const table = useTemplateRef('table')

function applyRequestStatusFilterFromQuery() {
  const statusColumn = table.value?.tableApi?.getColumn('membership_request_status')
  if (!statusColumn) return
  const status = route.query.status
  statusColumn.setFilterValue(typeof status === 'string' ? status : undefined)
}

onMounted(() => nextTick(applyRequestStatusFilterFromQuery))
watch(() => route.query.status, applyRequestStatusFilterFromQuery)

const requestStatusCounts = computed(() => {
  const counts = { pending: 0, rejected: 0 }
  for (const associate of requestAssociates.value) {
    if (associate.membership_request_status in counts) {
      counts[associate.membership_request_status as keyof typeof counts]++
    }
  }
  return counts
})

// Default tab is 'pending', not 'all' — this page opens straight on the
// queue that actually needs action, not a mixed pending+rejected list.
const statusTabs = computed(() => [
  { label: t('associate.tabs.all'), value: 'all' as const, count: undefined },
  { label: t('associate.tabs.pending'), value: 'pending' as const, count: requestStatusCounts.value.pending },
  { label: t('associate.tabs.rejected'), value: 'rejected' as const, count: requestStatusCounts.value.rejected }
])

const activeStatusTab = computed({
  get: () => (typeof route.query.status === 'string' ? route.query.status : 'pending'),
  set: (value: string | number) => {
    router.replace({ query: { ...route.query, status: value === 'pending' ? undefined : value } })
  }
})

// Oldest request first — a queue is worked front-to-back, not the roster's
// insertion-order default.
const sorting = ref([{ id: 'request_date', desc: false }])

const columnFilters = ref([])

const columnHeaders = {
  membershipRequestStatus: t('associate.columns.membershipRequestStatus'),
  requestDate: t('associate.columns.requestDate'),
  associateType: t('associate.columns.associateType'),
  consentData: t('associate.columns.consentData'),
  consentSocial: t('associate.columns.consentSocial'),
  hasReadStatute: t('associate.columns.hasReadStatute'),
  firstName: t('associate.columns.firstName'),
  lastName: t('associate.columns.lastName'),
  emailAddress: t('associate.columns.emailAddress'),
  phoneNumber: t('associate.columns.phoneNumber'),
  taxCode: t('associate.columns.taxCode'),
  bornDate: t('associate.columns.bornDate'),
  bornLocation: t('associate.columns.bornLocation'),
  bornProvince: t('associate.columns.bornProvince'),
  bornState: t('associate.columns.bornState'),
  residencyAddress: t('associate.columns.residencyAddress'),
  residencyHouseNumber: t('associate.columns.residencyHouseNumber'),
  residencyCity: t('associate.columns.residencyCity'),
  residencyProvince: t('associate.columns.residencyProvince'),
  residencyCap: t('associate.columns.residencyCap'),
  mtgoNickname: t('associate.columns.mtgoNickname'),
  mtgaNickname: t('associate.columns.mtgaNickname')
} as const

type ColumnHeaderKey = keyof typeof columnHeaders

function getColumnLabel(id: string): string {
  return id in columnHeaders ? columnHeaders[id as ColumnHeaderKey] : id
}

const visibilityItems = computed(() => getVisibilityItems())

const getVisibilityItems = (): DropdownMenuItem[] => {
  const allColumns = table.value?.tableApi?.getAllColumns()
  if (!allColumns) return []

  return allColumns
    .filter((column: Column<Associate>) => column.getCanHide())
    .map(createVisibilityItem)
}

function createVisibilityItem(column: Column<Associate>): DropdownMenuItem {
  return {
    label: getColumnLabel(column.id),
    type: 'checkbox' as const,
    checked: column.getIsVisible(),
    onUpdateChecked(checked: boolean) {
      table.value?.tableApi?.getColumn(column.id)?.toggleVisibility(!!checked)
    },
    onSelect(e: Event) {
      e.preventDefault()
    }
  }
}

// Birth/residency/MTG detail stay available (toggleable) but hidden by
// default — same "not needed at a glance" reasoning as the roster's own
// columnVisibility, just a different set of columns qualifying.
const columnVisibility = ref({
  bornDate: false,
  bornLocation: false,
  bornProvince: false,
  bornState: false,
  residencyAddress: false,
  residencyHouseNumber: false,
  residencyCity: false,
  residencyProvince: false,
  residencyCap: false,
  mtgoNickname: false,
  mtgaNickname: false
})

const rowSelection = ref({})

const UCheckbox = resolveComponent('UCheckbox')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const columns: TableColumn<Associate>[] = [
  {
    id: 'select',
    enableSorting: false,
    enableHiding: false,
    meta: { class: { th: 'text-center', td: 'text-center' } },
    header: ({ table }) =>
      h(UCheckbox, {
        'modelValue': table.getIsSomePageRowsSelected()
          ? 'indeterminate'
          : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          table.toggleAllPageRowsSelected(!!value),
        'aria-label': t('common.selectAll')
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        'modelValue': row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
        'aria-label': t('common.selectRow')
      })
  },
  {
    accessorKey: 'membership_request_status',
    header: ({ column }) => sortableHeader(columnHeaders.membershipRequestStatus, column),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => {
      const status = row.getValue('membership_request_status') as string
      const statusConfig: Record<string, { color: string, icon: string }> = {
        pending: { color: 'warning', icon: ICONS.pending },
        rejected: { color: 'error', icon: ICONS.statusRejected }
      }
      const { color, icon } = statusConfig[status] || { color: 'neutral', icon: ICONS.help }

      return h(resolveComponent('UBadge'), {
        class: 'capitalize cursor-pointer hover:opacity-80 transition-opacity gap-2',
        variant: 'subtle',
        icon,
        color,
        label: upperFirst(status),
        onClick: (e: Event) => {
          e.stopPropagation()
          table?.value?.tableApi?.getColumn('membership_request_status')?.setFilterValue(status)
        }
      })
    }
  },
  {
    accessorKey: 'request_date',
    header: ({ column }) => sortableHeader(columnHeaders.requestDate, column),
    meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
    cell: ({ row }) => formatDateTime(row.original.request_date)
  },
  {
    accessorKey: 'first_name',
    header: ({ column }) => sortableHeader(columnHeaders.firstName, column),
    cell: ({ row }) => row.original.first_name
  },
  {
    accessorKey: 'last_name',
    header: ({ column }) => sortableHeader(columnHeaders.lastName, column),
    cell: ({ row }) => row.original.last_name
  },
  {
    accessorKey: 'email_address',
    header: columnHeaders.emailAddress,
    cell: ({ row }) => row.original.email_address
  },
  {
    accessorKey: 'phone_number',
    header: columnHeaders.phoneNumber,
    meta: { class: { td: 'font-mono' } },
    cell: ({ row }) => row.original.phone_number
  },
  {
    accessorKey: 'tax_code',
    header: columnHeaders.taxCode,
    meta: { class: { td: 'font-mono' } },
    cell: ({ row }) => row.original.tax_code
  },
  {
    accessorKey: 'associate_type',
    header: ({ column }) => sortableHeader(columnHeaders.associateType, column),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => renderAssociateTypeBadge(row.original.associate_type)
  },
  {
    accessorKey: 'consent_data',
    header: ({ column }) => sortableHeader(columnHeaders.consentData, column),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => renderConsentBadge(row.original.consent_data)
  },
  {
    accessorKey: 'consent_social',
    header: ({ column }) => sortableHeader(columnHeaders.consentSocial, column),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => renderConsentBadge(row.original.consent_social)
  },
  {
    accessorKey: 'has_read_statute',
    header: ({ column }) => sortableHeader(columnHeaders.hasReadStatute, column),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => renderConsentBadge(row.original.has_read_statute)
  },
  {
    accessorKey: 'born_date',
    header: ({ column }) => sortableHeader(columnHeaders.bornDate, column),
    meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
    cell: ({ row }) => formatDate(row.original.born_date)
  },
  {
    accessorKey: 'born_location',
    header: columnHeaders.bornLocation,
    cell: ({ row }) => row.original.born_location || ''
  },
  {
    accessorKey: 'born_province',
    header: columnHeaders.bornProvince,
    meta: { class: { td: 'font-mono' } },
    cell: ({ row }) => row.original.born_province || ''
  },
  {
    accessorKey: 'born_state',
    header: columnHeaders.bornState,
    cell: ({ row }) => row.original.born_state || ''
  },
  {
    accessorKey: 'residency_address',
    header: columnHeaders.residencyAddress,
    cell: ({ row }) => row.original.residency_address
  },
  {
    accessorKey: 'residency_house_number',
    header: columnHeaders.residencyHouseNumber,
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }) => row.original.residency_house_number || ''
  },
  {
    accessorKey: 'residency_city',
    header: columnHeaders.residencyCity,
    cell: ({ row }) => row.original.residency_city
  },
  {
    accessorKey: 'residency_province',
    header: columnHeaders.residencyProvince,
    meta: { class: { td: 'font-mono' } },
    cell: ({ row }) => row.original.residency_province
  },
  {
    accessorKey: 'residency_cap',
    header: columnHeaders.residencyCap,
    meta: { class: { th: 'text-right', td: 'text-right font-mono' } },
    cell: ({ row }) => row.original.residency_cap
  },
  {
    accessorKey: 'mtgo_nickname',
    header: columnHeaders.mtgoNickname,
    cell: ({ row }) => row.original.mtgo_nickname
  },
  {
    accessorKey: 'mtga_nickname',
    header: columnHeaders.mtgaNickname,
    cell: ({ row }) => row.original.mtga_nickname
  }
]

// Same convention as associates/index.vue: point at this deploy's own
// /tesseramento for now, until the subdomain is wired up in DNS (docs/TODO.md).
// Lives here, not on the roster: sharing the public form is part of the
// request-intake workflow, not roster management.
const tesseramentoLink = computed(() => `${useRequestURL().origin}/tesseramento`)
const informativaDatiLink = computed(() => `${useRequestURL().origin}/tesseramento/informativa-dati`)
</script>

<template>
  <UDashboardPanel id="associates-richieste">
    <template #header>
      <UDashboardNavbar :title="$t('associate.subNav.requests')" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <AssociatesListAddModal v-model="isModalOpen" />

          <USeparator orientation="vertical" class="h-4" />

          <CopyLinkButton :url="tesseramentoLink" :label="$t('associate.copyTesseramentoLink')" />
          <UTooltip :text="$t('associate.openTesseramentoLink')">
            <UButton
              :to="tesseramentoLink"
              target="_blank"
              :icon="ICONS.externalLink"
              :aria-label="$t('associate.openTesseramentoLink')"
              color="neutral"
              variant="outline"
              square
            />
          </UTooltip>

          <USeparator orientation="vertical" class="h-4" />

          <UTooltip :text="$t('associate.openInformativaDatiLink')">
            <UButton
              :to="informativaDatiLink"
              target="_blank"
              :icon="ICONS.externalLink"
              :aria-label="$t('associate.openInformativaDatiLink')"
              color="neutral"
              variant="outline"
              square
            />
          </UTooltip>

          <USeparator orientation="vertical" class="h-4" />

          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>

      <!-- Switcher shared with /associates (see AssociatesSubNav). -->
      <UDashboardToolbar>
        <AssociatesSubNav :pending-count="pendingCount" />
      </UDashboardToolbar>

      <UDashboardToolbar :ui="{ root: 'flex-wrap h-auto py-2 gap-1.5', left: 'gap-4 flex-wrap' }">
        <template #left>
          <StatusFilterGroup v-model="activeStatusTab" :items="statusTabs" />
        </template>

        <template #right>
          <AssociatesListApproveModal
            v-if="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
            :ids="table.tableApi.getFilteredSelectedRowModel().rows.map(row => row.original.id)"
          >
            <UButton
              :label="$t('associate.approveModal.approve')"
              color="success"
              variant="subtle"
              :icon="ICONS.confirm"
            >
              <template #trailing>
                <UKbd>
                  {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length }}
                </UKbd>
              </template>
            </UButton>
          </AssociatesListApproveModal>

          <UDropdownMenu :items="visibilityItems" :content="{ align: 'end' }">
            <UButton
              :label="$t('common.showColumns')"
              color="neutral"
              variant="outline"
              :trailing-icon="ICONS.settingsColumns"
            />
          </UDropdownMenu>

          <UButton
            :icon="ICONS.refresh"
            color="neutral"
            variant="outline"
            :loading="loading"
            @click="refetch"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UTable
        ref="table"
        v-model:sorting="sorting"
        v-model:column-filters="columnFilters"
        v-model:column-visibility="columnVisibility"
        v-model:row-selection="rowSelection"
        :virtualize="{
          estimateSize: 35,
          overscan: 12
        }"
        :data="requestAssociates"
        :columns="columns"
        class="flex-1 h-80 shrink-0"
        :loading="loading"
        sticky="header"
        :ui="{
          base: 'border-separate border-spacing-0',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          tr: 'hover:bg-elevated/50',
          td: 'border-b border-default py-1 px-2'
        }"
      />

      <div class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto">
        <div class="text-sm text-muted">
          {{ $t('associate.selectedRows', {
            selected: table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0,
            total: table?.tableApi?.getFilteredRowModel().rows.length || 0
          }) }}
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
