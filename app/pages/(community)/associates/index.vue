<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { upperFirst } from 'scule'
import { getPaginationRowModel } from '@tanstack/table-core'
import type { Row } from '@tanstack/table-core'
import type { Associate } from '~/types'

const { breadcrumbItems } = useBreadcrumbs()

const UButton = resolveComponent('UButton')
// const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UCheckbox = resolveComponent('UCheckbox')

const route = useRoute()
const router = useRouter()
const isModalOpen = ref(false)

onMounted(() => {
  if (route.query.action === 'create') {
    isModalOpen.value = true
    router.replace({ query: {} })
  }
})

const toast = useToast()
const table = useTemplateRef('table')

const columnFilters = ref([{
  id: 'email_address',
  value: ''
}])

const columnVisibility = ref({
  id: false,
  uuid: false,
  created_at: false,
  updated_at: false,
  request_date: false,
  association_date: false,
  companion_code: false,
  mtga_nickname: false,
  mtgo_nickname: false
})

const rowSelection = ref({})

const { data, status } = await useFetch<Associate[]>('/api/associates', {
  lazy: true
})

function getRowItems(row: Row<Associate>) {
  return [
    {
      type: 'label',
      label: 'Actions'
    },
    {
      label: 'Copia ID associato',
      icon: 'i-lucide-copy',
      onSelect() {
        navigator.clipboard.writeText(row.original.id.toString())
        toast.add({
          title: 'Copia in corso',
          description: 'ID associato copiato negli appunti'
        })
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Vedi dettagli associato',
      icon: 'i-lucide-list'
    },
    {
      label: 'Vedi pagamenti associato',
      icon: 'i-lucide-wallet'
    },
    {
      type: 'separator'
    }
  ]
}

const columns: TableColumn<Associate>[] = [
  {
    id: 'select',
    header: ({ table }) =>
      h(UCheckbox, {
        'modelValue': table.getIsSomePageRowsSelected()
          ? 'indeterminate'
          : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          table.toggleAllPageRowsSelected(!!value),
        'ariaLabel': 'Select all'
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        'modelValue': row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
        'ariaLabel': 'Select row'
      })
  },
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => row.original.id
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      const statusConfig: Record<string, { color: string, icon: string }> = {
        approved: { color: 'success', icon: 'i-lucide-check-circle' },
        pending: { color: 'warning', icon: 'i-lucide-circle-dot-dashed' },
        rejected: { color: 'error', icon: 'i-lucide-x-circle' }
      }
      const { color, icon } = statusConfig[status] || { color: 'neutral', icon: 'i-lucide-help-circle' }

      return h(resolveComponent('UBadge'), {
        class: 'capitalize cursor-pointer hover:opacity-80 transition-opacity gap-2',
        variant: 'subtle',
        icon,
        color,
        label: upperFirst(status),
        onClick: (_: Event) => {
          // Filter by status when badge is clicked
          const statusColumn = table?.value?.tableApi?.getColumn('status')
          if (statusColumn) {
            statusColumn.setFilterValue(status)
          }
        }
      })
    }
  },
  {
    accessorKey: 'uuid',
    header: 'UUID',
    cell: ({ row }) => row.original.uuid
  },
  {
    accessorKey: 'created_at',
    header: 'Created At',
    cell: ({ row }) => row.original.created_at
  },
  {
    accessorKey: 'updated_at',
    header: 'Updated At',
    cell: ({ row }) => row.original.updated_at
  },
  {
    accessorKey: 'request_date',
    header: 'Request Date',
    cell: ({ row }) => row.original.request_date
  },
  {
    accessorKey: 'association_date',
    header: 'Association Date',
    cell: ({ row }) => row.original.association_date
  },
  {
    accessorKey: 'pauperwave_associate_number',
    header: 'PW Associate Number',
    cell: ({ row }) => row.original.pauperwave_associate_number
  },
  {
    accessorKey: 'consent_data',
    header: 'Consent Data',
    cell: ({ row }) => renderConsentBadge(row.original.consent_data)
  },
  {
    accessorKey: 'consent_social',
    header: 'Consent Social',
    cell: ({ row }) => renderConsentBadge(row.original.consent_social)
  },
  {
    accessorKey: 'has_read_statute',
    header: 'Read Statute',
    cell: ({ row }) => renderConsentBadge(row.original.has_read_statute)
  },
  {
    accessorKey: 'has_acknowledged_surveillance_notice',
    header: 'Surveillance Notice',
    cell: ({ row }) => renderConsentBadge(row.original.has_acknowledged_surveillance_notice)
  },
  {
    accessorKey: 'associate_type',
    header: 'Associate Type',
    cell: ({ row }) => row.original.associate_type
  },
  {
    accessorKey: 'tax_code',
    header: 'Tax Code',
    cell: ({ row }) => row.original.tax_code
  },
  {
    accessorKey: 'first_name',
    header: 'Nome',
    cell: ({ row }) => row.original.first_name
  },
  {
    accessorKey: 'last_name',
    header: 'Cognome',
    cell: ({ row }) => row.original.last_name
  },
  {
    accessorKey: 'email_address',
    header: 'Email',
    cell: ({ row }) => row.original.email_address
  },
  {
    accessorKey: 'phone_number',
    header: 'Phone',
    cell: ({ row }) => row.original.phone_number
  },
  {
    accessorKey: 'born_location',
    header: 'Born Location',
    cell: ({ row }) => row.original.born_location
  },
  {
    accessorKey: 'born_date',
    header: 'Born Date',
    cell: ({ row }) => row.original.born_date
  },
  {
    accessorKey: 'born_province',
    header: 'Born Province',
    cell: ({ row }) => row.original.born_province
  },
  {
    accessorKey: 'born_state',
    header: 'Born State',
    cell: ({ row }) => row.original.born_state
  },
  {
    accessorKey: 'residency_address',
    header: 'Residency Address',
    cell: ({ row }) => row.original.residency_address
  },
  {
    accessorKey: 'residency_city',
    header: 'Residency City',
    cell: ({ row }) => row.original.residency_city
  },
  {
    accessorKey: 'residency_province',
    header: 'Residency Province',
    cell: ({ row }) => row.original.residency_province
  },
  {
    accessorKey: 'residency_cap',
    header: 'Residency CAP',
    cell: ({ row }) => row.original.residency_cap
  },
  {
    accessorKey: 'mtgo_nickname',
    header: 'MTGO Nickname',
    cell: ({ row }) => row.original.mtgo_nickname
  },
  {
    accessorKey: 'mtga_nickname',
    header: 'MTGA Nickname',
    cell: ({ row }) => row.original.mtga_nickname
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      return h(
        'div',
        { class: 'text-right' },
        h(
          UDropdownMenu,
          {
            content: {
              align: 'end'
            },
            items: getRowItems(row)
          },
          () =>
            h(UButton, {
              icon: 'i-lucide-ellipsis-vertical',
              color: 'neutral',
              variant: 'ghost',
              class: 'ml-auto'
            })
        )
      )
    }
  }
]

function renderConsentBadge(consentvalue: boolean) {
  const consent = consentvalue
  const consentConfig: Record<string, { label: string, color: string, icon: string }> = {
    yes: { label: 'Yes', color: 'success', icon: 'i-lucide-check-circle' },
    no: { label: 'No', color: 'error', icon: 'i-lucide-circle-x' }
  }

  return h(resolveComponent('UBadge'), {
    variant: 'subtle',
    class: 'w-[60px]',
    ...consentConfig[consent ? 'yes' : 'no']
  })
}

const statusFilter = ref('all')

watch(() => statusFilter.value, (newVal) => {
  if (!table?.value?.tableApi) return

  const statusColumn = table.value.tableApi.getColumn('status')
  if (!statusColumn) return

  if (newVal === 'all') {
    statusColumn.setFilterValue(undefined)
  } else {
    statusColumn.setFilterValue(newVal)
  }
})

const pagination = ref({
  pageIndex: 0,
  pageSize: 20
})
</script>

<template>
  <UDashboardPanel id="associates">
    <template #header>
      <UDashboardNavbar title="Associati">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <AssociatesListAddModal v-model="isModalOpen" />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" class="ms-2" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <UInput
          :model-value="(table?.tableApi?.getColumn('email_address')?.getFilterValue() as string)"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Filter emails..."
          @update:model-value="table?.tableApi?.getColumn('email_address')?.setFilterValue($event)"
        />

        <div class="flex flex-wrap items-center gap-1.5">
          <AssociatesListDeleteModal :count="table?.tableApi?.getFilteredSelectedRowModel().rows.length">
            <UButton
              v-if="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
              label="Delete"
              color="error"
              variant="subtle"
              icon="i-lucide-trash"
            >
              <template #trailing>
                <UKbd>
                  {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length }}
                </UKbd>
              </template>
            </UButton>
          </AssociatesListDeleteModal>

          <USelect
            v-model="statusFilter"
            :items="[
              { label: 'All', value: 'all' },
              { label: 'Subscribed', value: 'subscribed' },
              { label: 'Unsubscribed', value: 'unsubscribed' },
              { label: 'Bounced', value: 'bounced' }
            ]"
            :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
            placeholder="Filter status"
            class="min-w-28"
          />
          <UDropdownMenu
            :items="
              table?.tableApi
                ?.getAllColumns()
                .filter((column: any) => column.getCanHide())
                .map((column: any) => ({
                  label: upperFirst(column.id),
                  type: 'checkbox' as const,
                  checked: column.getIsVisible(),
                  onUpdateChecked(checked: boolean) {
                    table?.tableApi?.getColumn(column.id)?.toggleVisibility(!!checked)
                  },
                  onSelect(e?: Event) {
                    e?.preventDefault()
                  }
                }))
            "
            :content="{ align: 'end' }"
          >
            <UButton
              label="Display"
              color="neutral"
              variant="outline"
              trailing-icon="i-lucide-settings-2"
            />
          </UDropdownMenu>
        </div>
      </div>

      <UTable
        ref="table"
        v-model:column-filters="columnFilters"
        v-model:column-visibility="columnVisibility"
        v-model:row-selection="rowSelection"
        v-model:pagination="pagination"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel()
        }"
        class="shrink-0"
        :data="data"
        :columns="columns"
        :loading="status === 'pending'"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0 text-sm',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-1 px-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default py-1 px-2'
        }"
      />

      <div class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto">
        <div class="text-sm text-muted">
          {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }} of
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} row(s) selected.
        </div>

        <div class="flex items-center gap-1.5">
          <UPagination
            :default-page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
            :items-per-page="table?.tableApi?.getState().pagination.pageSize"
            :total="table?.tableApi?.getFilteredRowModel().rows.length"
            @update:page="(p: number) => table?.tableApi?.setPageIndex(p - 1)"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
