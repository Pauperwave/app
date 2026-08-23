<!-- app\pages\(settings)\trash.vue -->
<script lang="ts" setup>
import type { TrashItem } from '~/types'

definePageMeta({ permission: 'view-trash' })

const { t } = useI18n()

useSeoMeta({ title: () => t('trash.breadcrumb') })

const {
  data: trashData, isLoading: loading, isPending, status, refetch
} = useTrashQuery()
const data = computed(() => trashData.value ?? [])
const skeletonCount = computed(() => (isPending.value ? undefined : data.value.length))

const { restoreItem, purgeItem } = useTrashMutations()
const toast = useToast()

async function onRestore(item: TrashItem) {
  await restoreItem.mutateAsync({ entity: item.entity, id: item.id })
  toast.add({
    title: t('trash.restoreSuccess', { name: item.name }),
    color: 'success',
    icon: ICONS.success
  })
}

const { can } = useUserRole()
const { data: settingsData } = useSettingsQuery()
const retentionDays = computed(() =>
  settingsData.value?.trashRetentionDays ?? DEFAULT_TRASH_RETENTION_DAYS)

// One row at a time (no bulk purge, same YAGNI reasoning as restore) —
// pendingPurge holds the row awaiting confirmation, cleared on cancel/confirm.
const pendingPurge = ref<TrashItem | null>(null)
const purgeConfirmOpen = ref(false)

function onPurgeRequest(item: TrashItem) {
  pendingPurge.value = item
  purgeConfirmOpen.value = true
}

async function onConfirmPurge() {
  const item = pendingPurge.value
  if (!item) return

  await purgeItem.mutateAsync({ entity: item.entity, id: item.id })
  purgeConfirmOpen.value = false
  toast.add({
    title: t('trash.purgeSuccess', { name: item.name }),
    color: 'success',
    icon: ICONS.success
  })
}

const infoDescription = computed(() => [
  t('trash.info.enabled'),
  t('trash.info.disabled'),
  t('trash.info.retention', { days: retentionDays.value })
].join(' '))

const { columns } = useTrashTableColumns(
  onRestore, onPurgeRequest, () => can('purge-trash'), () => retentionDays.value
)

const sorting = ref([{ id: 'deletedAt', desc: true }])
</script>

<template>
  <UDashboardPanel id="trash">
    <template #header>
      <UDashboardNavbar :title="$t('trash.breadcrumb')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #trailing>
          <USeparator orientation="vertical" class="h-4" />

          <QueryRefreshControl :is-loading="loading" :status="status" @refresh="refetch" />
        </template>

        <template #right>
          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-6">
        <UAlert
          color="info"
          variant="subtle"
          :icon="ICONS.info"
          :title="$t('trash.info.title')"
          :description="infoDescription"
        />

        <ListSkeleton v-if="isPending" :count="skeletonCount" :columns="columns.length" />

        <template v-else-if="data.length">
          <UTable
            v-model:sorting="sorting"
            :data="data"
            :columns="columns"
            :loading="loading"
            class="w-full"
          />
        </template>

        <p v-else class="text-muted text-sm text-center py-12">
          {{ $t('trash.empty') }}
        </p>
      </div>
    </template>
  </UDashboardPanel>

  <ConfirmModal
    v-model:open="purgeConfirmOpen"
    :title="pendingPurge ? $t('trash.purgeConfirmTitle', { name: pendingPurge.name }) : ''"
    :warning="$t('common.confirmDeleteWarning')"
    :confirm-label="$t('trash.purge')"
    :confirm-icon="ICONS.delete"
    :loading="purgeItem.isLoading.value"
    @confirm="onConfirmPurge"
  />
</template>
