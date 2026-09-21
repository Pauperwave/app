<!-- app\components\tournaments\EntryFeeBadge.vue -->
<!--
  A tournament's entry fee as a badge ("Gratis" or "10,00 €"), with a
  permission-gated quick-change UPopover behind it — the number-input
  counterpart of ui/StatusChangeBadge.vue's dropdown. Read-only badge when the
  caller lacks `manage-tournaments`.
-->
<script setup lang="ts">
import type { Tournament } from '~/types'

const { tournament } = defineProps<{ tournament: Tournament }>()

const { t } = useI18n()
const { can } = useUserRole()
const toast = useToast()
const { setEntryFee } = useTournamentsMutations()

const isOpen = ref(false)
const pickedEntryFee = ref<number | undefined>(undefined)

const fee = computed(() => tournament.entryFee ?? 0)
// Free green, up to 5 € blue, up to 10 € amber, anything above primary.
const color = computed(() => {
  if (fee.value <= 0) return 'success'
  if (fee.value <= 5) return 'info'
  if (fee.value <= 10) return 'warning'
  return 'primary'
})
const label = computed(() => fee.value > 0
  ? `${fee.value.toFixed(2)} €`
  : t('tournament.columns.entryFeeFree'))

// Seeded on open, so a cancelled edit never leaks into the next one.
watch(isOpen, (open) => {
  if (open) pickedEntryFee.value = fee.value
})

async function confirm() {
  if (pickedEntryFee.value === undefined) return
  try {
    await setEntryFee.mutateAsync({ id: tournament.id, entryFee: pickedEntryFee.value })
    isOpen.value = false
  } catch (err) {
    toast.add({
      title: t('tournament.entryFeeChangeErrorTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  }
}
</script>

<template>
  <!-- Wrapping span so a click never reaches the table row's own @select. -->
  <span class="contents" @click.stop>
    <UTooltip
      v-if="can('manage-tournaments')"
      :text="t('common.editableBadgeHint')"
    >
      <span class="inline-flex">
        <UPopover v-model:open="isOpen">
          <UBadge
            :color="color"
            variant="subtle"
            :icon="ICONS.euro"
            :label="label"
            class="shrink-0 cursor-pointer"
          />

          <template #content>
            <div class="flex items-center gap-2 p-3">
              <UInputNumber
                v-model="pickedEntryFee"
                :min="0"
                :step="5"
                :icon="ICONS.euro"
                class="w-32"
              />
              <UButton
                :label="t('common.confirm')"
                :loading="setEntryFee.isLoading.value"
                @click="confirm"
              />
            </div>
          </template>
        </UPopover>
      </span>
    </UTooltip>

    <UBadge
      v-else
      :color="color"
      variant="subtle"
      :icon="ICONS.euro"
      :label="label"
      class="shrink-0"
    />
  </span>
</template>
