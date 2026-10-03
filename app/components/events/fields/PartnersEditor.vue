<!-- app\components\events\fields\PartnersEditor.vue -->
<!-- The event form's partners: any number of collaborators/sponsors, each with a name, a role
     and an optional link and logo URL. The list order is the display order; blank rows are
     dropped on save (cleanEventPartners). -->
<script setup lang="ts">
import { EVENT_PARTNER_ROLES } from '#shared/utils/events/eventPartners'
import type { EventPartnerInput } from '#shared/utils/events/eventPartners'

const partners = defineModel<EventPartnerInput[]>({ required: true })

const { t } = useI18n()

const roleOptions = EVENT_PARTNER_ROLES.map(role => ({
  value: role,
  label: t(`event.partners.roles.${role}`)
}))

function addPartner() {
  partners.value = [...partners.value, { name: '', role: 'collaborator', logoUrl: null, linkUrl: null }]
}

function removePartner(index: number) {
  partners.value = partners.value.filter((_, partnerIndex) => partnerIndex !== index)
}

function updatePartner(index: number, changes: Partial<EventPartnerInput>) {
  partners.value = partners.value.map((partner, partnerIndex) =>
    partnerIndex === index ? { ...partner, ...changes } : partner)
}
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="(partner, index) in partners"
      :key="index"
      class="space-y-2 rounded-md border border-default p-2"
    >
      <div class="flex items-center gap-2">
        <UInput
          :model-value="partner.name"
          :placeholder="t('event.partners.namePlaceholder')"
          :icon="ICONS.player"
          class="flex-1"
          @update:model-value="updatePartner(index, { name: $event as string })"
        />
        <USelect
          :model-value="partner.role"
          :items="roleOptions"
          class="w-40"
          @update:model-value="updatePartner(index, { role: $event as EventPartnerInput['role'] })"
        />
        <UButton
          :icon="ICONS.delete"
          :aria-label="t('event.partners.remove')"
          color="error"
          variant="ghost"
          @click="removePartner(index)"
        />
      </div>
      <div class="grid grid-cols-2 gap-2">
        <UInput
          :model-value="partner.linkUrl ?? ''"
          :placeholder="t('event.partners.linkPlaceholder')"
          :icon="ICONS.link"
          @update:model-value="updatePartner(index, { linkUrl: ($event as string) || null })"
        />
        <UInput
          :model-value="partner.logoUrl ?? ''"
          :placeholder="t('event.partners.logoPlaceholder')"
          :icon="ICONS.image"
          @update:model-value="updatePartner(index, { logoUrl: ($event as string) || null })"
        />
      </div>
    </div>

    <UButton
      :label="t('event.partners.add')"
      :icon="ICONS.add"
      color="neutral"
      variant="outline"
      size="sm"
      @click="addPartner"
    />
  </div>
</template>
