<!-- app\components\events\fields\DetailFields.vue -->
<!--
  What an event has beyond its tournaments (user request, 2026-10-03, modeled on Radio Atog 2026):
  tagline and edition, description, practical notes, tickets, membership and partners. Shared by
  AddModal.vue and EditModal.vue — `state` is the SAME reactive object the parent binds to its own
  <UForm :state>, mutated directly, same as TournamentDataFields.vue; the partners are a separate
  v-model (a list, not a schema field).
-->
<!-- eslint-disable vue/no-mutating-props -- see the comment above -->
<script setup lang="ts">
import type { EventFormState } from '~/composables/events/useEventFormFields'
import type { EventPartnerInput } from '#shared/utils/events/eventPartners'

const { state } = defineProps<{
  state: EventFormState
}>()

const partners = defineModel<EventPartnerInput[]>('partners', { required: true })
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
  <div class="space-y-2">
    <p class="text-lg font-semibold text-primary">
      {{ $t('event.details.title') }}
    </p>

    <div class="flex gap-2">
      <UFormField
        :label="$t('event.details.tagline')"
        name="tagline"
        class="flex-1"
      >
        <UInput
          :model-value="state.tagline ?? ''"
          :placeholder="$t('event.details.taglinePlaceholder')"
          class="w-full"
          @update:model-value="state.tagline = ($event as string) || undefined"
        />
      </UFormField>

      <UFormField
        :label="$t('event.details.edition')"
        name="edition"
        class="w-32 shrink-0"
      >
        <UInputNumber
          v-model="state.edition"
          :min="1"
          :icon="ICONS.hash"
          class="w-full"
        />
      </UFormField>
    </div>

    <UFormField :label="$t('event.details.description')" name="description">
      <UTextarea
        :model-value="state.description ?? ''"
        :rows="3"
        class="w-full"
        @update:model-value="state.description = ($event as string) || undefined"
      />
    </UFormField>

    <UFormField :label="$t('event.details.practicalNotes')" name="practicalNotes">
      <UTextarea
        :model-value="state.practicalNotes ?? ''"
        :placeholder="$t('event.details.practicalNotesPlaceholder')"
        :rows="2"
        class="w-full"
        @update:model-value="state.practicalNotes = ($event as string) || undefined"
      />
    </UFormField>

    <p class="pt-2 text-lg font-semibold text-primary">
      {{ $t('event.details.ticketsTitle') }}
    </p>

    <div class="flex gap-2">
      <UFormField
        :label="$t('event.details.ticketsUrl')"
        name="ticketsUrl"
        class="flex-1"
      >
        <UInput
          :model-value="state.ticketsUrl ?? ''"
          :icon="ICONS.link"
          class="w-full"
          @update:model-value="state.ticketsUrl = ($event as string) || undefined"
        />
      </UFormField>

      <UFormField
        :label="$t('event.details.ticketsOnSaleOn')"
        name="ticketsOnSaleOn"
        class="w-44 shrink-0"
      >
        <UInput
          :model-value="state.ticketsOnSaleOn ?? ''"
          type="date"
          class="w-full"
          @update:model-value="state.ticketsOnSaleOn = ($event as string) || undefined"
        />
      </UFormField>
    </div>

    <UFormField name="membershipRequired" :description="$t('event.details.membershipRequiredHint')">
      <USwitch
        v-model="state.membershipRequired"
        :label="$t('event.details.membershipRequired')"
      />
    </UFormField>

    <UFormField
      v-if="state.membershipRequired"
      :label="$t('event.details.membershipUrl')"
      name="membershipUrl"
    >
      <UInput
        :model-value="state.membershipUrl ?? ''"
        :icon="ICONS.link"
        class="w-full"
        @update:model-value="state.membershipUrl = ($event as string) || undefined"
      />
    </UFormField>

    <p class="pt-2 text-lg font-semibold text-primary">
      {{ $t('event.partners.title') }}
    </p>

    <EventsFieldsPartnersEditor v-model="partners" />
  </div>
</template>
