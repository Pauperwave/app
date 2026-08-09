<!-- app\components\home\HomeSales.vue -->
<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Period, Range, Sale } from '~/types'

// period/range are wired up for when a real sales endpoint replaces the
// empty placeholder below, kept as props so the parent binding stays intact.
defineProps<{
  period: Period
  range: Range
}>()

const { t } = useI18n()

const UBadge = resolveComponent('UBadge')

// No sales backend exists yet — the table renders with real columns, no rows.
const data: Sale[] = []

const columns: TableColumn<Sale>[] = [
  {
    accessorKey: 'id',
    header: t('home.sales.columns.id'),
    cell: ({ row }) => `#${row.getValue('id')}`
  },
  {
    accessorKey: 'date',
    header: t('home.sales.columns.date'),
    cell: ({ row }) => {
      return new Date(row.getValue('date')).toLocaleString('it-IT', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    }
  },
  {
    accessorKey: 'status',
    header: t('home.sales.columns.status'),
    cell: ({ row }) => {
      const color = {
        paid: 'success' as const,
        failed: 'error' as const,
        refunded: 'neutral' as const
      }[row.getValue('status') as string]

      return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () =>
        row.getValue('status')
      )
    }
  },
  {
    accessorKey: 'email',
    header: t('home.sales.columns.email')
  },
  {
    accessorKey: 'amount',
    header: () => h('div', { class: 'text-right' }, t('home.sales.columns.amount')),
    cell: ({ row }) => {
      const amount = Number.parseFloat(row.getValue('amount'))

      const formatted = new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR'
      }).format(amount)

      return h('div', { class: 'text-right font-medium' }, formatted)
    }
  }
]
</script>

<template>
  <UTable
    :data="data"
    :columns="columns"
    class="shrink-0"
    :ui="{
      base: 'table-fixed border-separate border-spacing-0',
      thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
      tbody: '[&>tr]:last:[&>td]:border-b-0',
      th: 'first:rounded-l-lg last:rounded-r-lg border-y border-default '
        + 'first:border-l last:border-r',
      td: 'border-b border-default'
    }"
  />
</template>
