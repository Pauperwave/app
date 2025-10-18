<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { upperFirst } from 'scule'
import type { Associate } from '~/types'
import { format, parseISO } from 'date-fns'

const { associates, loading, refresh } = useAssociates()

const { breadcrumbItems } = useBreadcrumbs()

const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UCheckbox = resolveComponent('UCheckbox')

const route = useRoute()
const router = useRouter()
const isModalOpen = ref(false)

function formatDateTime(isoString?: string): string {
  if (!isoString) return ''
  try {
    const date = parseISO(isoString)
    return format(date, 'dd/MM/yyyy HH:mm')
  } catch {
    return ''
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) return ''
  try {
    const date = parseISO(dateString)
    return format(date, 'dd/MM/yyyy')
  } catch {
    return ''
  }
}

// 2025-01-02

onMounted(() => {
  if (route.query.action === 'create') {
    isModalOpen.value = true
    router.replace({ query: {} })
  }
})

const table = useTemplateRef('table')

const columnFilters = ref([])

const columnVisibility = ref({
  uuid: false,
  created_at: false,
  updated_at: false
  // updated_by: false,
  // association_date: false,
  // pauperwave_associate_number: false,
  // associate_type: false,
  // tax_code: false,
  // born_location: false,
  // born_date: false,
  // born_province: false,
  // born_state: false,
  // residency_address: false,
  // residency_city: false,
  // residency_province: false,
  // residency_cap: false,
  // mtgo_nickname: false,
  // mtga_nickname: false,
  // actions: false
})

// 2025-10-15T17:49:32.040789+00:00

const rowSelection = ref({})

const columns: TableColumn<Associate>[] = [
  {
    id: 'select',
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) =>
      h(UCheckbox, {
        'modelValue': table.getIsSomePageRowsSelected()
          ? 'indeterminate'
          : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          table.toggleAllPageRowsSelected(!!value),
        'aria-label': 'Select all'
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        'modelValue': row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
        'aria-label': 'Select row'
      })
  },
  {
    accessorKey: 'id',
    header: 'ID',
    meta: {
      class: {
        td: 'font-mono'
      }
    },
    cell: ({ row }) => row.original.id
  },
  {
    accessorKey: 'uuid',
    header: 'UUID',
    cell: ({ row }) =>
      h(resolveComponent('UBadge'), {
        variant: 'subtle',
        color: 'neutral',
        class: 'font-mono',
        label: String(row.original.uuid)
      })
  },
  {
    accessorKey: 'created_at',
    header: 'Data di creazione',
    meta: {
      class: {
        td: 'font-mono'
      }
    },
    cell: ({ row }) => formatDateTime(row.original.created_at)
  },
  {
    accessorKey: 'updated_at',
    header: 'Data di aggiornamento',
    meta: {
      class: {
        td: 'font-mono'
      }
    },
    cell: ({ row }) => formatDateTime(row.original.updated_at)
  },
  {
    accessorKey: 'updated_by',
    header: 'Aggiornato da',
    meta: {
      class: {
        td: 'font-mono'
      }
    },
    cell: ({ row }) => formatDateTime(row.original.updated_by)
  },
  {
    accessorKey: 'request_status',
    header: 'Request Status',
    cell: ({ row }) => {
      const status = row.getValue('request_status') as string
      const statusConfig: Record<string, { color: string, icon: string }> = {
        accepted: { color: 'success', icon: 'i-lucide-check-circle' },
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
          const statusColumn = table?.value?.tableApi?.getColumn('status')
          if (statusColumn) {
            statusColumn.setFilterValue(status)
          }
        }
      })
    }
  },
  {
    accessorKey: 'request_date',
    header: 'Data richiesta',
    meta: {
      class: {
        td: 'font-mono'
      }
    },
    cell: ({ row }) => formatDateTime(row.original.request_date)
  },
  {
    accessorKey: 'payment_date',
    header: 'Pagamento',
    meta: {
      class: {
        td: 'font-mono'
      }
    },
    cell: ({ row }) => formatDate(row.original.payment_date)
  },
  {
    accessorKey: 'association_date',
    header: 'Data di associazione',
    meta: {
      class: {
        td: 'font-mono'
      }
    },
    cell: ({ row }) => formatDate(row.original.association_date)
  },
  {
    accessorKey: 'first_name',
    header: 'Nome',
    meta: {
      class: {
        td: 'font-mono'
      }
    },
    cell: ({ row }) => row.original.first_name
  },
  {
    accessorKey: 'last_name',
    header: 'Cognome',
    meta: {
      class: {
        td: 'w-40 font-mono'
      }
    },
    cell: ({ row }) => row.original.last_name
  },
  {
    accessorKey: 'email_address',
    header: 'Email',
    cell: ({ row }) =>
      h(resolveComponent('UBadge'), {
        variant: 'subtle',
        color: 'neutral',
        class: 'font-mono',
        label: String(row.original.email_address)
      })
  },
  {
    accessorKey: 'phone_number',
    header: 'Phone',
    meta: {
      class: {
        td: 'font-mono'
      }
    },
    cell: ({ row }) => row.original.phone_number
  }
]

// function renderConsentBadge(consentvalue: boolean) {
//   const consent = consentvalue
//   const consentConfig: Record<string, { label: string, color: string, icon: string }> = {
//     yes: { label: 'Yes', color: 'success', icon: 'i-lucide-check-circle' },
//     no: { label: 'No', color: 'error', icon: 'i-lucide-circle-x' }
//   }

//   return h(resolveComponent('UBadge'), {
//     variant: 'subtle',
//     class: 'w-[60px]',
//     ...consentConfig[consent ? 'yes' : 'no']
//   })
// }

const statusFilter = ref('accepted')

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
              { label: 'Tutti', value: 'all' },
              { label: 'Accettati', value: 'accepted' },
              { label: 'In attesa', value: 'pending' },
              { label: 'Rifiutati', value: 'rejected' }
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

          <!-- ✅ Add refresh button -->
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="outline"
            :loading="loading"
            @click="refresh"
          />
        </div>
      </div>

      <!-- ✅ Fixed table props -->
      <UTable
        ref="table"
        v-model:column-filters="columnFilters"
        v-model:column-visibility="columnVisibility"
        v-model:row-selection="rowSelection"
        virtualize
        :data="associates"
        :columns="columns"
        class="flex-1 h-80 shrink-0"
        :loading="loading"
        :ui="{
          base: 'border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-1 px-1.5 border-y border-x border-default first:rounded-l-lg last:rounded-r-lg',
          td: 'border-b border-x border-default py-1 px-2'
        }"
      />

      <div class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto">
        <div class="text-sm text-muted">
          {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }} di
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} righe selezionate.
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
