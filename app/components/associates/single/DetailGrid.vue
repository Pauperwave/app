<!-- app\components\associates\single\DetailGrid.vue -->
<script setup lang="ts">
import type { Associate } from '~/types'

const { associate } = defineProps<{ associate: Associate }>()

const { t } = useI18n()

const fields = computed(() => buildAssociateDetailFields(associate, t))
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <DetailCard
      :title="$t('associate.detail.sections.anagrafica')"
      :fields="fields.anagrafica"
    />

    <DetailCard
      :title="$t('associate.detail.sections.contatti')"
      :fields="fields.contatti"
    />

    <DetailCard
      :title="$t('associate.detail.sections.tesseramento')"
      :fields="fields.tesseramento"
    >
      <template #before>
        <div class="flex justify-between items-center gap-4">
          <dt class="flex items-center gap-1.5 text-muted">
            <UIcon :name="ICONS.badgeCheck" class="size-4 shrink-0" /> {{ $t('associate.columns.membershipStatus') }}
          </dt>
          <dd>
            <MembershipStatusBadge :status="associate.membership_status" />
          </dd>
        </div>
        <div class="flex justify-between items-center gap-4">
          <dt class="flex items-center gap-1.5 text-muted">
            <UIcon :name="ICONS.idCard" class="size-4 shrink-0" /> {{ $t('associate.columns.pauperwaveAssociateNumber') }}
          </dt>
          <dd>
            <AssociateNumberBadge :number="associate.pauperwave_associate_number" />
          </dd>
        </div>
        <div class="flex justify-between items-center gap-4">
          <dt class="flex items-center gap-1.5 text-muted">
            <UIcon :name="ICONS.tag" class="size-4 shrink-0" /> {{ $t('associate.columns.associateType') }}
          </dt>
          <dd>
            <AssociateTypeBadge :type="associate.associate_type" />
          </dd>
        </div>
      </template>
    </DetailCard>

    <DetailCard
      :title="$t('associate.detail.sections.consensi')"
      :fields="[]"
    >
      <template #before>
        <div
          v-for="field in fields.consensi"
          :key="field.label"
          class="flex justify-between items-center gap-4"
        >
          <dt class="flex items-center gap-1.5 text-muted">
            <UIcon :name="field.icon" class="size-4 shrink-0" /> {{ field.label }}
          </dt>
          <dd>
            <ConsentBadge :value="field.value" />
          </dd>
        </div>
      </template>
    </DetailCard>
  </div>
</template>
