# MTG Commanders Sync

This document describes the synchronization strategy for the `mtg_commanders` table, which stores Commander-legal Magic cards for deck building and card search functionality.

## Overview

The `mtg_commanders` table is populated and maintained via a Supabase Edge Function that syncs data from Scryfall's API. This provides:

- Single source of truth for commander data across the application
- Elimination of client-side Scryfall API calls
- Pre-computed flags for partner mechanics and commander-specific attributes
- Monthly automated sync with manual trigger option for emergency updates

## Sync Strategy

### Frequency

- **Scheduled**: Monthly (after set release dates)
- **Manual trigger**: Protected endpoint for emergency sync after ban announcements

### Data Source

Scryfall's paginated search API:
```
https://api.scryfall.com/cards/search?q=legal:commander+is:commander&unique=cards
```

This approach is preferred over bulk data download because:
- Scryfall handles all commander eligibility logic correctly
- Avoids local filtering logic errors
- ~3k results, ~30 pages - negligible for server-side operation
- No user-facing latency concerns

## Edge Function Implementation

### Scheduled Sync Function

```typescript
// supabase/functions/sync-mtg-commanders/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SCRYFALL_SEARCH_URL = "https://api.scryfall.com/cards/search?q=legal:commander+is:commander&unique=cards"
const DELAY_MS = 100 // 50-100ms delay between requests per Scryfall terms

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  let url = SCRYFALL_SEARCH_URL
  const allCards = []
  let pageCount = 0

  // Paginate through all results
  while (url) {
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.object === 'error') {
      throw new Error(`Scryfall API error: ${data.details}`)
    }

    allCards.push(...(data.data || []))
    pageCount++
    
    url = data.has_more ? data.next_page : null
    
    // Rate limiting delay
    if (url) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS))
    }
  }

  console.log(`Fetched ${allCards.length} commanders from ${pageCount} pages`)

  // Process and upsert cards
  for (const card of allCards) {
    const { partnerType, partnerWithScryfallId, partnerGroupTag } = classifyPartnerMechanic(card)
    
    const commanderData = {
      scryfall_id: card.id,
      scryfall_url: card.scryfall_uri,
      card_name: card.name,
      image_url: card.image_uris?.large || card.card_faces?.[0]?.image_uris?.large,
      mana_cost: card.mana_cost || card.card_faces?.[0]?.mana_cost,
      cmc: card.cmc,
      color_identity: card.color_identity,
      type_line: card.type_line || card.card_faces?.[0]?.type_line,
      keywords: card.keywords || card.card_faces?.[0]?.keywords,
      oracle_text: card.oracle_text || card.card_faces?.[0]?.oracle_text,
      power: card.power || card.card_faces?.[0]?.power,
      toughness: card.toughness || card.card_faces?.[0]?.toughness,
      partner_type: partnerType,
      partner_with_scryfall_id: partnerWithScryfallId,
      partner_group_tag: partnerGroupTag,
      legalities: card.legalities,
      prices: card.prices,
      released_at: card.released_at,
      reprint_count: card.reprint_count,
      edhrec_rank: card.edhrec_rank,
      last_synced_at: new Date().toISOString()
    }

    // Upsert with conflict resolution
    const { error } = await supabase
      .from('mtg_commanders')
      .upsert(commanderData, {
        onConflict: 'scryfall_id',
        ignoreDuplicates: false
      })

    if (error) {
      console.error(`Error upserting ${card.name}:`, error)
    }
  }

  // Update sync metadata
  await supabase
    .from('sync_metadata')
    .upsert({
      table_name: 'mtg_commanders',
      last_synced_at: new Date().toISOString(),
      card_count: allCards.length
    }, {
      onConflict: 'table_name'
    })

  return new Response(
    JSON.stringify({ 
      success: true, 
      cardsProcessed: allCards.length,
      pages: pageCount 
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

### Manual Trigger Function

```typescript
// supabase/functions/sync-mtg-commanders-manual/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const SECRET_HEADER = 'x-sync-secret'

serve(async (req) => {
  // Verify secret header for security
  const secret = req.headers.get(SECRET_HEADER)
  if (secret !== Deno.env.get('SYNC_SECRET')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Call the main sync function (or import shared logic)
  // For simplicity, this could just call the scheduled function
  const syncResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-mtg-commanders`)
  const result = await syncResponse.json()

  return new Response(
    JSON.stringify({ 
      success: true,
      triggered: 'manual',
      ...result 
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

## Partner Classification Logic

The sync function classifies partner mechanics into three categories:

### Classification Algorithm

```typescript
function classifyPartnerMechanic(card: any): {
  partnerType: string | null,
  partnerWithScryfallId: string | null,
  partnerGroupTag: string | null
} {
  const keywords = card.keywords || card.card_faces?.[0]?.keywords || []
  const partnerKeyword = keywords.find((k: string) => k.startsWith("Partner"))

  let partnerType = null
  let partnerWithScryfallId = null
  let partnerGroupTag = null

  if (partnerKeyword === "Partner") {
    // Generic partner - pairs with any other partner card
    partnerType = "partner"
  } else if (partnerKeyword?.startsWith("Partner with")) {
    // Named partner - pairs with one specific card
    partnerType = "partner_with"
    // Extract target from all_parts, not string parsing
    partnerWithScryfallId = card.all_parts
      ?.find(p => p.component === "combo_piece" && p.id !== card.id)?.id ?? null
  } else if (partnerKeyword?.startsWith("Partner—")) {
    // Group partner - pairs with any card sharing the same tag
    partnerType = "partner_group"
    partnerGroupTag = partnerKeyword.replace("Partner—", "").trim() // e.g., "Survivors", "Father & son"
  }

  return { partnerType, partnerWithScryfallId, partnerGroupTag }
}
```

### Partner Types

| Type | Description | Example | Query Pattern |
|------|-------------|---------|---------------|
| `partner` | Generic partner, pairs with any other partner | Sidar Kondo of Jamuraa | Find all other `partner` cards |
| `partner_with` | Named partner, pairs with one specific card | Kraum, Ludevic's Opus | Find card by `partner_with_scryfall_id` |
| `partner_group` | Group partner, pairs with any card sharing the tag | Kratos, Stoic Father (Partner—Father & son) | Find all cards with same `partner_group_tag` |
| `friends_forever` | Friends forever mechanic | Halana and Alena, Partners | Find all `friends_forever` cards |
| `doctor` | Time Lord Doctor commander | The Doctor | Find all `doctor` cards |
| `doctors_companion` | Doctor's companion side | Rose Tyler | Find all `doctors_companion` cards |
| `background_commander` | Choose a Background commander | Charmed-Lieutenant | Find all `background_commander` cards |
| `background` | Background enchantment (selectable as second commander) | Personas of the Faceless | Find all `background` cards |

### Query Examples

```sql
-- For 'partner': find all other partner cards
SELECT * FROM mtg_commanders 
WHERE partner_type = 'partner' AND scryfall_id != $1;

-- For 'partner_with': find the one specific target
SELECT * FROM mtg_commanders 
WHERE scryfall_id = $partner_with_scryfall_id;

-- For 'partner_group': find all cards sharing the same tag
SELECT * FROM mtg_commanders 
WHERE partner_type = 'partner_group' 
  AND partner_group_tag = $tag 
  AND scryfall_id != $1;
```

## Sync Metadata Table

Track sync status and card count for monitoring:

```sql
CREATE TABLE public.sync_metadata (
  table_name text primary key,
  last_synced_at timestamptz not null,
  card_count int not null,
  sync_status text not null default 'success' -- 'success' | 'failed' | 'in_progress'
);
```

## Scheduling

### Cron Job (via Supabase Dashboard)

1. Go to Supabase Dashboard → Edge Functions
2. Create a new cron job for `sync-mtg-commanders`
3. Schedule: Monthly (e.g., on the 1st of each month)
4. Set timezone appropriately for set release timing

### Manual Trigger

```bash
curl -X POST https://your-project.supabase.co/functions/v1/sync-mtg-commanders-manual \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-sync-secret: YOUR_SECRET_KEY"
```

## Scryfall API Compliance

- **User-Agent**: Identify your app in requests
- **Rate limiting**: 50-100ms delay between requests
- **Bulk data**: Using paginated search instead of bulk endpoint to avoid local filtering logic
- **Terms**: Respect Scryfall's API terms of service

## React Integration

Replace the current localStorage-based whitelist loading with Supabase queries:

```javascript
// Old approach (6 paginated Scryfall calls)
const commanders = await fetchAllNames('https://api.scryfall.com/cards/search?q=(game:paper) is:commander')

// New approach (single Supabase query)
const { data: commanders } = await supabase
  .from('mtg_commanders')
  .select('card_name, mana_cost, color_identity, partner_type, partner_group_tag')
  .eq('partner_type', 'partner')

// For partner whitelist
const partners = commanders.filter(c => c.partner_type === 'partner')

// For background whitelist
const backgrounds = await supabase
  .from('mtg_commanders')
  .select('card_name')
  .eq('partner_type', 'background')
```

## Troubleshooting

### Sync Fails Mid-Process

- Check logs in Supabase Dashboard → Edge Functions
- Verify Scryfall API status
- Ensure rate limiting delays are respected

### Missing Commanders

- Verify sync completed successfully (check `sync_metadata`)
- Check if new set was released after last sync
- Run manual trigger if needed

### Partner Classification Errors

- Review Scryfall card data for edge cases
- Check `all_parts` array for partner_with cards
- Verify keyword extraction logic

## Future Enhancements

- Add webhook notification on sync completion
- Implement diff-based sync to reduce write load
- Add sync status dashboard in admin UI
- Cache popular commander queries in Redis
