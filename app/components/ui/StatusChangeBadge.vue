<!-- app\components\ui\StatusChangeBadge.vue -->
<!--
  A status UBadge with a permission-gated quick-change UDropdownMenu behind
  it — extracted out of tournaments/StatusBadge.vue and leagues/StatusBadge.vue
  (2026-08-31), which were near-byte-identical modulo the domain's status
  union/icon map/color fn/mutation. Read-only badge (no dropdown) when the
  caller lacks `permission`. Other call sites (the tournaments table, bulk
  actions bar) still render their own inline version for now — swapping those
  to this component is deferred, see docs/TODO.md.
-->
<script setup lang="ts" generic="T extends string">
import type { BadgeProps, DropdownMenuItem } from '@nuxt/ui'

interface Props {
  id: number
  status: T
  statuses: readonly T[]
  icons: Record<T, string>
  color: (status: T) => BadgeProps['color']
  label: (status: T) => string
  permission: Permission
  errorTitle: string
  mutateAsync: (payload: { id: number, status: T }) => Promise<unknown>
}

const {
  id, status, statuses, icons, color, label, permission, errorTitle, mutateAsync
} = defineProps<Props>()

const { can } = useUserRole()
const toast = useToast()

async function changeStatus(newStatus: T) {
  try {
    await mutateAsync({ id, status: newStatus })
  } catch (err) {
    toast.add({ title: errorTitle, description: toErrorMessage(err), color: 'error' })
  }
}

const items = computed<DropdownMenuItem[]>(() => statuses.map(s => ({
  label: label(s),
  icon: icons[s],
  color: color(s),
  checked: s === status,
  type: 'checkbox' as const,
  onSelect: () => changeStatus(s)
})))
</script>

<template>
  <UDropdownMenu
    v-if="can(permission)"
    :items="items"
    :content="{ align: 'end' }"
    @click.stop.prevent
  >
    <UBadge
      :color="color(status)"
      :icon="icons[status]"
      variant="subtle"
      class="shrink-0 cursor-pointer"
    >
      {{ label(status) }}
    </UBadge>
  </UDropdownMenu>

  <UBadge
    v-else
    :color="color(status)"
    :icon="icons[status]"
    variant="subtle"
    class="shrink-0"
  >
    {{ label(status) }}
  </UBadge>
</template>
