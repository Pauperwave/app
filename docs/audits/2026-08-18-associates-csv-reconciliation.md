# Associates roster vs. Google Form CSV reconciliation

<!-- docs/audits/2026-08-18-associates-csv-reconciliation.md -->

Follow-up on the unfinished 2026-08-12 reconciliation between `pauperwave_associates` and the historical Google Form signup roster (`.scratch/associates.csv`, `.scratch/diff_report2.txt`). The 83-missing-people half was acted on (migration `20260818150000_import_missing_associates_from_roster.sql`, 81 imported — see its header for why 83 → 81). This doc is the deferred half: what to do about the **171 field conflicts** on the 240 already-matched associates. Nothing here has been written to the DB yet — recommendations only.

## Method note

`diff_report2.txt` (the final, refined pass — `diff_associates2.py`) already applies substring-tolerant normalization to cut noise from the first pass's 670 conflicts down to 171. This doc categorizes those 171 by field and adds targeted verification (Italian postal-code/province plausibility, cross-checking `pauperwave_associate_number` deltas against the DB's own renumbering history) that the diff script itself doesn't do.

## `pauperwave_associate_number` — 87 conflicts, **no action recommended**

The DB is authoritative here, not the sheet. Cross-checked every delta between the DB's number and the sheet's number for the associate at that email:

- The bulk (72 of 87) show a small, growing positive offset (DB number = sheet number + 2..7, growing with row position) — classic signature of the DB being renumbered after some earlier rows were removed, while the sheet's copy of the number was never updated.
- The remaining 15 are larger, non-sequential deltas (e.g. DB `PW-0177` vs sheet `PW-0314`). Checked these by name-similarity against the *entire* DB roster (not just the row they collided with) — none matched anyone else. These are sheet-side data-entry artifacts (most likely from someone filling the form more than once — the diff script keeps "last occurrence wins," and a later fill's number field looks to have been copied from an unrelated later batch), not real identity conflicts.

Both patterns point the same direction: trust the DB, not the sheet, for this field.

## `residency_address` — 71 conflicts, **spot-check only, no bulk action**

Overwhelmingly punctuation/abbreviation noise the substring-tolerance check still couldn't absorb both directions (e.g. `"Via Diaz 19"` vs `"Vi a diaz 19"` — a typo, not a real difference; `"Via E.Bezzi 3"` vs `"Via Ergisto Bezzi 3"` — abbreviation, not a real difference). None of the 71 reviewed looked like a **wrong** address on either side, just differently formatted. Not worth a bulk pass; if someone's address bounces mail, fix it individually then.

## `tax_code` — 5 conflicts, **DB is correct on all 5**

Every one of these is the sheet having a malformed value, not the DB:

| Associate | DB (correct) | Sheet |
|---|---|---|
| Gianfranco Rizzi | `RZZGFR85D29I441L` (16 chars) | `RZZGFR85D29I44L` (15 — missing a char) |
| Matteo Zuiani | `ZNUMTT88P30C758S` (16) | `ZNUMTT8P30C758S` (15 — missing a digit) |
| Dario Rizzitello | `RZZDRA00C07G273L` (16) | `RZZDRA00CC07G273L` (17 — extra char) |
| Ivo Köll | `KLLVCH95P26Z102W` (16) | `-` (placeholder) |
| Brandon Williams | `WLLBND93E09L840U` (16) | `N/A` (placeholder) |

Italian codice fiscale is always exactly 16 characters — the DB values are well-formed, the sheet's aren't. No action.

## `residency_city`/`province`/`cap` — 6 conflicts, mixed

| Associate | Field | DB | Sheet | Verdict |
|---|---|---|---|---|
| Marco Battagliola | province | `TN` | `IT` | DB correct — `IT` is a country code, not a province |
| Alessandro Cont | cap | `38060` | `4` | DB correct — sheet value is truncated garbage |
| Pietro Laudati | city | `Padova` | `Padiva` | DB correct — `Padiva` isn't a real place name |
| Mattia Romano | city | `Brenzone sul Garda` | `Castello di Brenzone` | DB correct — sheet names a *frazione* within the DB's comune, not a conflict |
| **Davide Dicaro** | city | `Dres` | `Cles` | **Ambiguous** — `Dres` isn't a real Italian place name either; `Cles` is a real Trentino town. Needs asking the associate directly, can't resolve from data alone. |
| **Marco Bittolo** | province | `PN` (Pordenone) | `PO` (Prato) | **Ambiguous** — both are real Italian province codes. No way to tell which is the typo without more context. |

Recommend: fix the 4 clear ones to the DB's existing (already-correct) values — i.e. no write needed, they're already right. Flag the 2 ambiguous ones (Dicaro, Bittolo) for a direct check with the associate next renewal/contact, don't guess.

## `born_date` — 1 conflict, **real DB bug, fix recommended**

`id=230 Alex Donatini`: DB has `2025-07-20`, sheet has `1997-07-20`. A birth year of 2025 is impossible — this is a DB data-entry error (transposed/mistyped year), not a sheet discrepancy. **Recommend correcting the DB to `1997-07-20`.**

## The 3 "fills" (DB blank → sheet has a value) — 1 clean, 2 need judgment

`phone_number` on 3 associates:

| Associate | Sheet value | Verdict |
|---|---|---|
| Gernot Dalvai | `342726341` | Clean 9-digit number, valid Italian mobile prefix — safe to fill |
| Thomas Boldrini | `333` | Too short to be a real phone number — don't fill, would just be different garbage |
| Nahuel Coliva | `340083403r` | Trailing letter `r` — likely `340083403` with a typo, but not certain enough to silently strip and insert |

Recommend: fill Dalvai's phone number; leave the other two blank rather than fill with unreliable data.

## The 2 DB-only rows — resolved

- `id=1 APS Pauperwave` — the club's own account, not a real person, expected to have no sheet row.
- `id=36 Riccardo Nicolin` — **resolved** during the import work: the sheet's row for this person (`rik.nicolin@gmaio.com`) has a one-character email typo (`gmaio` vs `gmail`), which is why the diff script's email-based matching missed it. No DB action needed — the DB's email (`rik.nicolin@gmail.com`) is already correct.

## Summary of recommended actions

1. Fix `id=230 Alex Donatini`'s `born_date` to `1997-07-20`.
2. Fill `id=202 Gernot Dalvai`'s `phone_number` to `342726341`.
3. Everything else: no write needed — either the DB was already correct, or the conflict needs a direct question to the associate (Dicaro's city, Bittolo's province) rather than a guess.
