<script lang="ts" setup>
import { sub } from 'date-fns'
import type { Range } from '~/types'
import { h, resolveComponent } from 'vue'
import { getPaginationRowModel } from '@tanstack/vue-table'
import type { DropdownMenuItem, ContextMenuItem, TableColumn, TableRow } from '@nuxt/ui'
import { useClipboard } from '@vueuse/core'

const { breadcrumbItems } = useBreadcrumbs()

const UCheckbox = resolveComponent('UCheckbox')
const UBadge = resolveComponent('UBadge')

const toast = useToast()
const { copy } = useClipboard()

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})

const { data: tournaments } = await useFetch('/api/tournaments')

// Use the actual type from useFetch
type TournamentData = NonNullable<typeof tournaments.value>[number]

const columns: TableColumn<TournamentData>[] = [
  {
    id: 'select',
    enableHiding: false,
    enableSorting: false,
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
    header: '#',
    cell: ({ row }) => `#${row.getValue('id')}`
  }, // Added missing comma here
  {
    accessorKey: 'status',
    header: 'Stato',
    cell: ({ row }) => {
      const color = {
        'Completed': 'success' as const,
        'Scheduled': 'warning' as const,
        'Cancelled': 'error' as const,
        'Postponed': 'secondary' as const,
        'In Progress': 'primary' as const
      }[row.getValue('status') as string]

      return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () =>
        row.getValue('status')
      )
    }
  },
  {
    accessorKey: 'start_date',
    header: 'Data e Ora',
    cell: ({ row }) => {
      const value = row.getValue('start_date') as string
      if (!value) return '-'
      // Parse and format timestampz (ISO string)
      const date = new Date(value)
      return date.toLocaleString('it-IT', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  },
  {
    accessorKey: 'round_count',
    header: () => h('div', { class: 'text-center' }, 'Partite'),
    cell: ({ row }) => row.getValue('round_count')
  },
  {
    accessorKey: 'round_duration',
    header: () => h('div', { class: 'text-center' }, 'Durata Partita'),
    cell: ({ row }) => {
      const duration = row.getValue('round_duration') as number
      return `${duration} min`
    }
  },
  {
    accessorKey: 'registered_players',
    header: 'Giocatori Iscritti',
    cell: ({ row }) => row.getValue('registered_players')
  },
  {
    accessorKey: 'league',
    header: () => h('div', { class: 'text-center' }, 'Lega'),
    cell: ({ row }) => {
      const leagueValue = row.getValue('league') as string
      const colorMap: Record<string, 'neutral'> = {
        'Magman Autunno 2025': 'neutral'
      }
      const color = colorMap[leagueValue] || ('neutral' as const)

      return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () => leagueValue)
    }
  },
  {
    accessorKey: 'format',
    header: () => h('div', { class: 'text-center' }, 'Formato'),
    cell: ({ row }) => {
      const color = {
        'Commander': 'primary' as const,
        'Commander Party': 'error' as const,
        'Commander Precon': 'warning' as const
      }[row.getValue('format') as string]

      return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () =>
        row.getValue('format')
      )
    }
  },
  {
    accessorKey: 'location',
    header: () => h('div', { class: 'text-center' }, 'Luogo'),
    cell: ({ row }) => {
      const locationValue = row.getValue('location') as string
      const colorMap: Record<string, 'neutral'> = {
        Magman: 'neutral'
      }
      const color = colorMap[locationValue] || ('neutral' as const)

      return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () => locationValue)
    }
  },
  {
    accessorKey: 'entry_fee',
    header: () => h('div', { class: 'text-center' }, 'Quota Iscrizione'),
    cell: ({ row }) => {
      const amount = Number.parseFloat(row.getValue('entry_fee') as string)

      const formatted = new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR'
      }).format(amount)

      return h('div', { class: 'text-right font-medium' }, formatted)
    }
  },
  {
    accessorKey: 'companion_code',
    header: () => h('div', { class: 'text-center' }, 'Codice Companion'),
    cell: ({ row }) =>
      h('div', { class: 'text-center' }, row.getValue('companion_code') || '-')
  }
]

const table = useTemplateRef('table')

const rowSelection = ref<Record<string, boolean>>({})

function onSelect(row: TableRow<TournamentData>) {
  console.info('Selected row:', row.original.id)
  toast.add({
    title: `Apri torneo del ${row.original.start_date}`,
    color: 'info',
    icon: 'i-lucide-info'
  })
}

const items = ref<ContextMenuItem[]>([])

function getRowItems(row: TableRow<TournamentData>) {
  const items: ContextMenuItem[] = []

  // Only add the copy option if companion_code exists
  if (row.original.companion_code) {
    items.push({
      label: 'Copia codice Companion',
      icon: 'i-lucide-copy',
      onSelect() {
        copy(row.original.companion_code!)

        toast.add({
          title: 'Codice Companion copiato negli appunti!',
          color: 'success',
          icon: 'i-lucide-circle-check'
        })
      }
    })
  }

  items.push(
    {
      label: 'Vedi dettagli torneo',
      icon: 'i-lucide-swords',
      onSelect() {
        toast.add({
          title: 'Vedi dettagli torneo',
          color: 'success',
          icon: 'i-lucide-circle-check'
        })
      }
    }
  )

  if (row.original.league) {
    items.push({
      label: 'Vedi dettagli lega',
      icon: 'i-lucide-trophy',
      onSelect() {
        toast.add({
          title: 'Vedi dettagli lega',
          color: 'success',
          icon: 'i-lucide-circle-check'
        })
      }
    })
  }

  if (row.original.event) {
    items.push({
      label: 'Vedi dettagli evento',
      icon: 'i-lucide-calendar',
      onSelect() {
        toast.add({
          title: 'Vedi dettagli evento',
          color: 'success',
          icon: 'i-lucide-circle-check'
        })
      }
    })
  }

  items.push(
    {
      label: 'Elimina torneo',
      icon: 'i-lucide-trash',
      color: 'error',
      disabled: !row.getIsSelected(), // Enable only if the row is selected
      onSelect() {
        toast.add({
          title: 'Elimina torneo',
          color: 'success',
          icon: 'i-lucide-circle-check'
        })
      }
    }
  )

  return items
}

function onContextmenu(_e: Event, row: TableRow<TournamentData>) {
  items.value = getRowItems(row)
}

const columnVisibility = ref({
  id: false
})

const getVisibilityItems = (): DropdownMenuItem[] => {
  return table.value?.tableApi
    ?.getAllColumns()
    .filter(column => column.getCanHide())
    .map(column => ({
      label: column.id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      type: 'checkbox' as const,
      checked: column.getIsVisible(),
      onUpdateChecked(checked: boolean) {
        table.value?.tableApi?.getColumn(column.id)?.toggleVisibility(!!checked)
      },
      onSelect(e: Event) {
        e.preventDefault()
      }
    })) ?? []
}

const globalFilter = ref('')

const pagination = ref({
  pageIndex: 0,
  pageSize: 15
})
</script>

<template>
  <UDashboardPanel id="events">
    <template #header>
      <UDashboardNavbar title="Eventi">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <TournamentsListAddModal />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" class="ms-2" />
        </template>
        <template #right>
          <HomeDateRangePicker v-model="range" class="-ms-1" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="flex flex-col flex-1 w-full space-y-4 pb-4">
        <div class="flex justify-between px-4 py-3.5 border-t border-b border-accented">
          <UInput v-model="globalFilter" class="max-w-sm" placeholder="Filter..." />
          <UDropdownMenu
            :items="getVisibilityItems()"
            :content="{ align: 'end' }"
          >
            <UButton
              label="Columns"
              color="neutral"
              variant="outline"
              trailing-icon="i-lucide-chevron-down"
            />
          </UDropdownMenu>
        </div>
        <UContextMenu :items="items">
          <UTable
            ref="table"
            v-model:pagination="pagination"
            v-model:global-filter="globalFilter"
            v-model:row-selection="rowSelection"
            v-model:column-visibility="columnVisibility"
            :data="tournaments"
            :columns="columns"
            class="shrink-0"
            :ui="{
              base: 'table-fixed border-separate border-spacing-0',
              thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
              tbody: '[&>tr]:last:[&>td]:border-b-0',
              th: 'first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
              td: 'border-b border-default'
            }"
            :pagination-options="{
              getPaginationRowModel: getPaginationRowModel()
            }"
            @select="onSelect"
            @contextmenu="onContextmenu"
          />
        </UContextMenu>

        <div class="px-4 py-3.5 border-t border-accented text-sm text-muted">
          {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }} su
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} riga(e) selezionata(e).
        </div>

        <div class="flex justify-center border-t border-default pt-4">
          <UPagination
            :default-page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
            :items-per-page="table?.tableApi?.getState().pagination.pageSize"
            :total="table?.tableApi?.getFilteredRowModel().rows.length"
            @update:page="(p) => table?.tableApi?.setPageIndex(p - 1)"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
