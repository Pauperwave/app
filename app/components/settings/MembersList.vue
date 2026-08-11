<!-- app\components\settings\MembersList.vue -->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Member } from '~/types'

defineProps<{
  members: Member[]
}>()

const { t } = useI18n()

// Placeholder actions: this settings screen is still the default template scaffold
const items = computed<DropdownMenuItem[]>(() => [{
  label: t('settings.members.list.editMember')
}, {
  label: t('settings.members.list.removeMember'),
  color: 'error' as const
}])

// The 4-tier role model from docs/architecture/roles.md (2026-08-10), not the
// live DB enum yet (see AppRole in app/types/index.d.ts) — this select still
// isn't wired to an actual assign_role call (roles.md's "Suggested order of
// work" step 3), it just shows the correct target roles instead of the
// unrelated placeholder values ('owner'/'judge'/'writer') the template
// scaffold shipped with.
const roleOptions = computed(() => (['player', 'organizer', 'admin', 'super_admin'] as const).map(role => ({
  label: t(`settings.members.roles.${role}`),
  value: role
})))

// Same convention as associate/[slug].vue and MapView.vue: a deterministic
// DiceBear avatar keyed by name (Member has no username — dropped 2026-08-11,
// nothing else in the app used it), except Emanuele Nardi's real GitHub
// avatar — same special case UserMenu.vue already hardcodes for the same
// person, kept consistent rather than introducing a second convention.
const avatarFor = (member: Member) => member.name === 'Emanuele Nardi'
  ? { src: 'https://github.com/emanuelenardi.png', alt: member.name }
  : { src: generatePlayerAvatar(member.name), alt: member.name }
</script>

<template>
  <ul role="list" class="divide-y divide-default">
    <li
      v-for="(member, index) in members"
      :key="index"
      class="flex items-center justify-between gap-3 py-3 px-4 sm:px-6"
    >
      <div class="flex items-center gap-3 min-w-0">
        <UAvatar
          v-bind="avatarFor(member)"
          size="md"
        />

        <p class="text-sm text-highlighted font-medium truncate min-w-0">
          {{ member.name }}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <USelect
          :model-value="member.role"
          :items="roleOptions"
          value-key="value"
          color="neutral"
        />

        <UDropdownMenu :items="items" :content="{ align: 'end' }">
          <UButton
            :icon="ICONS.ellipsisVertical"
            color="neutral"
            variant="ghost"
          />
        </UDropdownMenu>
      </div>
    </li>
  </ul>
</template>
