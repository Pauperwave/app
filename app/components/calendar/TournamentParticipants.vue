<!-- app\components\calendar\TournamentParticipants.vue -->
<!-- The numbered list of a tournament's participants in its calendar detail. -->
<script setup lang="ts">
defineProps<{ participants: string[] }>()

const { t } = useI18n()
</script>

<template>
  <div v-if="participants.length" class="pt-4 border-t border-default">
    <p class="text-xs font-medium uppercase text-muted mb-2">
      {{ t('tournament.participants') }} ({{ participants.length }})
    </p>
    <ul class="flex flex-col gap-2">
      <li
        v-for="(participant, index) in participants"
        :key="participant"
        class="flex items-center gap-2"
      >
        <span class="text-xs text-dimmed w-4 text-right shrink-0">{{ index + 1 }}.</span>
        <UUser
          :name="participant"
          :avatar="{ src: generatePlayerAvatar(participant), alt: participant }"
          size="sm"
        />
      </li>
    </ul>
  </div>
</template>
