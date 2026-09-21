<!-- app\components\tournaments\LocationChangeBadge.vue -->
<!--
  A tournament's venue badge with a permission-gated quick-change
  UDropdownMenu behind it — the venue counterpart of ui/StatusChangeBadge.vue.
  Read-only LocationBadge (Maps link) when the caller lacks
  `manage-tournaments`; with permission the badge opens the picker instead.
-->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Tournament } from '~/types'

const { tournament } = defineProps<{ tournament: Tournament }>()

const { t } = useI18n()
const { can } = useUserRole()
const toast = useToast()
const { setLocation } = useTournamentsMutations()
const { data: locations } = useLocationsQuery()

async function changeLocation(locationUuid: string | null) {
  try {
    await setLocation.mutateAsync({ id: tournament.id, locationUuid })
  } catch (err) {
    toast.add({
      title: t('tournament.locationChangeErrorTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  }
}

const items = computed<DropdownMenuItem[]>(() => [
  {
    label: t('tournament.columns.noLocation'),
    type: 'checkbox' as const,
    checked: !tournament.locationUuid,
    onSelect: () => changeLocation(null)
  },
  ...(locations.value ?? []).map(location => ({
    label: location.name,
    icon: ICONS.mapPin,
    type: 'checkbox' as const,
    checked: location.uuid === tournament.locationUuid,
    onSelect: () => changeLocation(location.uuid)
  }))
])
</script>

<template>
  <!-- Wrapping span, not @click.stop on UDropdownMenu: a listener there doesn't
       reliably stop the click from reaching the table row's own @select. -->
  <span class="contents" @click.stop>
    <UTooltip
      v-if="can('manage-tournaments')"
      :text="t('common.editableBadgeHint')"
    >
      <span class="inline-flex">
        <UDropdownMenu
          :items="items"
          :content="{ align: 'start' }"
        >
          <UBadge
            color="neutral"
            variant="subtle"
            :icon="ICONS.mapPin"
            :label="tournament.location?.split(' - ')[0] ?? t('tournament.columns.noLocation')"
            class="cursor-pointer"
            :ui="{ base: 'min-w-0', label: 'truncate min-w-0' }"
          />
        </UDropdownMenu>
      </span>
    </UTooltip>

    <BadgesLocationBadge
      v-else-if="tournament.location"
      :location="tournament.location"
      :location-address="tournament.locationAddress"
      :maps-url="tournament.locationMapsUrl"
    />
  </span>
</template>
