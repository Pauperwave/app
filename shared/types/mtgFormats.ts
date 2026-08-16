// shared\types\mtgFormats.ts

// Shared by ManageModal.vue and server/api/mtg-formats/*.post.ts — same
// thin-pass-through convention as shared/types/locations.ts.
export interface NewMtgFormatPayload {
  name: string
  description: string | null
}
