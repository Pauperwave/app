# Finance "Riepilogo per categoria" payment_amount corrections

<!-- docs/audits/2026-08-24-finance-payment-amount-corrections.md -->

While building `/finance`'s "Riepilogo per categoria" summary table (new `cost` column — the most common `payment_amount` per category, excluding `Comped`), two categories turned up a price that didn't match the rest of that category's transactions. Both were confirmed with the user and corrected directly in `pauperwave_payments` (project `uggrolzdntoamclgnzrt`) — not a migration, a one-off data fix.

## Torneo Pauper — 4 transactions at 5,00€ instead of 10,00€

Category `tournamentPauper` (Tournament Fee, tournament format = Pauper) was otherwise 92× 10,00€ (62 Cash + 30 POS) plus 74× 0,00€ Comped. 4 Cash transactions were 5,00€: ids **579, 581, 583, 584**, all the same tournament — **"Pauper"**, 2026-06-18 18:00 (`tournament.uuid = 4cb35927-6908-4ce0-bc32-b3ade11763bf`), receipts 267–270/T.

Checked for a same-day Commander tournament that these might have actually belonged to (user's first guess) — none exists in `tournaments` for 2026-06-18, only this Pauper one. User confirmed the entry fee should be 10,00€ regardless and asked to fix the amount in place, not the tournament link.

**Fix applied:** `UPDATE pauperwave_payments SET payment_amount = 10.00 WHERE id IN (579, 581, 583, 584)`.

## Sealed — 2 transactions at 2,50€ instead of 30,00€

Category `sealed` (Tournament Fee, tournament format = Sealed) has only one tournament all year — **"Sealed Lorwyn Eclipsed"**, 2026-02-12 19:00. 6 of its 8 transactions were 30,00€ (4 Cash + 2 POS); 2 Cash transactions were 2,50€: ids **114, 118**, receipts 28/T and 32/T.

A 30,00€ → 2,50€ drop (12×) on the same tournament reads as a transcription slip in the historical import, not a legitimate discount. User confirmed and asked to correct.

**Fix applied:** `UPDATE pauperwave_payments SET payment_amount = 30.00 WHERE id IN (114, 118)`.

## Also corrected in the same session: an earlier misreport, not a data bug

While investigating the above, an earlier claim in conversation that "Tesseramento annuale" (`Association Fee`) was a single 895,00€ lump transaction was wrong — re-querying showed it's actually 179 separate 5,00€ PayPal transactions (`179 × 5 = 895`), fully uniform. No DB change needed; noted here only so this doc doesn't read as if that category was ever touched.

## Categories checked, no issue found

- **Tesseramento annuale** (`Association Fee`): 179× 5,00€ PayPal — uniform.
- **Torneo Commander**: 59× 5,00€ Cash + 67× 5,00€ POS + 5× 0,00€ Comped — uniform.
- **Donazioni**: 5,00€ and 10,00€, one transaction each — expected to vary, not a pricing category.
- **Draft speciale** / **Commanderfest**: not price-checked this pass (single named events, not a per-format fee) — worth a similar pass if their `cost` column ever looks off. (Both were later folded into the generic byFormat/eventFee rows once the category table was made scalable — see the follow-up section below.)

## Gettoni (Token Purchase) — 1 transaction at 17,00€ instead of 15,00€

Once the "Riepilogo per categoria" table gained a `quantity` column for `tokenPurchase` (gettoni are bought in variable quantities per transaction, parsed from `event_name` — "6 gettoni" etc. — via `parseGettoniCount`), the per-gettone price should reduce to a clean total/quantity = 2,50€ (every other Token Purchase row fits `quantity × 2.50 = payment_amount` exactly). It didn't: id **557**, receipt 266/T, 2026-05-30, POS, "6 gettoni" was **17,00€** instead of 15,00€ (6×2,50) — a €2 discrepancy that skewed the computed unit price to ~2,52€.

**Fix applied:** `UPDATE pauperwave_payments SET payment_amount = 15.00 WHERE id = 557`.

## Reconciliation check on a pasted table snapshot — confirms the Sealed fix

User pasted a snapshot of the (pre-scalable-refactor) category table and asked where the error was, without pointing at a specific row. Checked every row for internal consistency (`Costo × Istanze = Totale`, and `Paypal + Contanti + Pos = Totale`):

| Categoria | Costo × Istanze | Totale riportato | Coerente? |
|---|---|---|---|
| Tesseramento annuale | 5,00 × 179 = 895,00 | 895,00 | ✅ |
| Torneo Pauper | 10,00 × 92 = 920,00 | 920,00 | ✅ |
| Torneo Commander | 5,00 × 130 = 650,00 | 650,00 | ✅ |
| **Sealed** | **30,00 × 8 = 240,00** | **185,00** | ❌ **gap di 55,00€** |
| Draft Speciale | 20,00 × 13 = 260,00 | 260,00 | ✅ |

Every column also cross-footed correctly (Paypal 910,00 / Contanti 1.789,00 / Pos 1.257,50 / Totale 3.956,50 all match the row-by-row sums), so the mismatch is isolated to the Sealed row alone.

A €55,00 gap at a 30,00€ sticker price is exactly 2 transactions short (2 × 27,50€ = 55,00€) — this is the same "Sealed — 2 transactions at 2,50€ instead of 30,00€" issue already found and fixed earlier in this doc (ids 114, 118). The pasted snapshot was taken before that fix landed in the DB (it already reflects the Pauper fix, going by its 920,00€ total, but not yet the Sealed one) — nothing further to do, the live data is already correct.

## Follow-up: category table made scalable (no hardcoded names)

The original `tournamentPauper`/`tournamentCommander`/`sealed`/`draftSpeciale`/`commanderfest` fixed categories (this doc's original scope) were replaced the same day with a scalable design: one row per tournament format that actually appears in `byFormat` (dynamic, no hardcoded format/tournament/event names), plus fixed `associationFee`/`eventFee`/`tokenPurchase`/`donation` rows. `eventFee` now combines every named event into one row instead of a single hardcoded "Commanderfest" row — see `useFinanceSummary.ts`'s `FinanceCategoryType` comment for the full reasoning.
