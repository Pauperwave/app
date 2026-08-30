<!-- app\components\locations\list\SocialLinks.vue -->
<script setup lang="ts">
import type { Location } from '~/types'

const { location } = defineProps<{ location: Location }>()
const { t } = useI18n()

// website moved here from the card footer (user request, 2026-08-19) — same
// icon-link treatment as the other socials, not a separate badge.
const links = computed(() => [
  { href: location.website, icon: ICONS.globe, label: t('location.card.website') },
  { href: location.facebook, icon: ICONS.facebook, label: 'Facebook' },
  { href: location.instagram, icon: ICONS.instagram, label: 'Instagram' },
  { href: location.telegramChannel, icon: ICONS.telegram, label: 'Telegram' },
  { href: location.whatsapp, icon: ICONS.whatsapp, label: 'WhatsApp' }
].filter((link): link is typeof link & { href: string } => !!link.href))
</script>

<template>
  <div v-if="links.length" class="flex items-center gap-3 mt-2">
    <UTooltip
      v-for="link in links"
      :key="link.label"
      :text="link.label"
    >
      <a
        :href="link.href"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="link.label"
        class="text-muted hover:text-highlighted"
      >
        <UIcon :name="link.icon" class="size-4" />
      </a>
    </UTooltip>
  </div>
</template>
