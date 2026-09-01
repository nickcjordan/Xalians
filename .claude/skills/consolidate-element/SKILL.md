---
name: consolidate-element
description: Run one element's full Stage 2 name-catalog consolidation (composition fan-out + audit) without missing a layer. Use whenever consolidating an element's ability-name cells, re-running a prior consolidation, or auditing composed cells.
---

# Consolidate Element (name catalog Stage 2)

One element in, one consolidated catalog file out. This process was burned twice by skipped layers (the action-synonym layer; the lexicon-vs-cells boundary) — follow every numbered step, in order, no steps from memory.

## Philosophy (ratified by Nick 2026-09-01 — supersedes anything older)

- Cells are RELATIVELY EXHAUSTIVE. The fun is semi-unique move names; the Pokemon shared-move model is explicitly rejected. Never curate down to favorites.
- Bar for keeping a name: logically sound + sounds good + passes every audit rule. NOT "great vs mediocre" (too subjective).
- Near-duplicates are welcome (Osmosis and Osmotic Drain both stay).
- The LEXICON layer is exhaustive (finite word supply, fully swept); the CELL layer is authored composition (generative space). Say this explicitly when presenting; it has confused twice.
- **Exhaustive-cross rule (added 2026-09-01 after the dark v2 failure):** composition is mechanical enumeration — every productive element word × every synonym in each action's pool, evaluated as a written-out name. Per-name dispositions only; class-level rejections ("anatomy words don't fit this element's register") are FORBIDDEN, and "doesn't fit the element's register/theme" is not a cut rule. Anatomy-flavored names get instrument tags, never register cuts. The rule lives in COMPOSITION-BRIEF.md v5 (sweep algorithm Steps 0/A/B/C, Section 7 forbidden rejection reasons, Section 9 cross matrices); verify the composer's matrices are per-intersection before accepting the output — a sentence-level class rejection means the run failed and must be redone.
- Coverage claims come only from the automated checker. Never state coverage from eyeballing.

## The three name layers (every cell draws from all three at generation)

1. Element-rooted names: element lexicon words alone or composed (Breaker, Water Hammer, Crushing Depths).
2. Element × action-synonym compositions: element word + action-synonym word (Tidal Smash, Wave Slam). MANDATORY — this is the layer that got skipped.
3. Neutral pools (separate shared file `neutral-pools.md`, one pool per action): bare action synonyms with no elemental meaning (Smash, Slam, Impale), drawable by any element. Never place bare synonyms in element cells; never duplicate pool names into element files.

## Inputs (all in `~/.claude/plans/xalian-catalog/`)

- `harvest-<element>.md` — the element's exhaustive lexicon (Stage 1).
- ALL action harvests: `harvest-action-{strike,lash,rake,shove,drain,ambush,beam,hurl,spray,burst,cloud,ward,terrorize}.md` + `harvest-actions-snare-crush-mend.md`.
- `COMPOSITION-BRIEF.md` (v5 or later — the consolidated single-document brief with the sweep algorithm, forbidden-rejection-reasons section, and synonym cross matrices; if the file still shows the amendment-stack format, stop and restore v5 first).
- `neutral-pools.md` (reference only — for leakage checks, not duplication).
- Any prior `consolidated-<element>.md` (standing hard cuts and Nick's rulings carry forward; process artifacts do not).

## Procedure

1. **Verify inputs exist** (Glob the files above) and that COMPOSITION-BRIEF.md is v5+ (single consolidated document). Fix the brief before anything else if not.
2. **Fan out FOUR Sonnet composer agents per element, four actions each** (added 2026-09-01 after the single-agent water v4 run sampled the cross — the full ~30k-intersection cross exceeds one agent's output budget, so one agent WILL silently triage). Standard split: A=strike/lash/rake/shove, B=drain/ambush/beam/hurl, C=spray/burst/cloud/snare, D=crush/ward/mend/terrorize. If a prior run produced a compliant Section 0 productive-word list, hand it to all four agents verbatim as the mandatory row set (never let each re-derive it — divergent lists break the merge); otherwise run a small Step-0-only agent first. Per-agent prompt skeleton:
   > Read COMPOSITION-BRIEF.md (v5+) in full and follow it exactly — especially Section 7 (forbidden rejection reasons) and Section 9.5 (cross matrices: EVERY productive word as a row, EVERY intersection K or a rejection code, blank/dash/"not composed" cells are forbidden and fail the run). YOUR ASSIGNMENT: the <ELEMENT> element, actions <four actions> ONLY. Element canon: <one-line mechanical fantasy>. Row set: the Section 0 productive-word list in <file>, verbatim. Inputs: harvest-<element>.md + the harvest files for your four actions. Standing rulings you must respect [full list]. Names already kept for your actions in <prior composed file> are ratified keeps — include them; your job is completing the cross around them. Output to composed-<element>-<letter>.md with cells, flags, and full matrices for your four actions.
   Launch all four in one message (parallel). Before accepting each output, verify: every Section 0 productive word appears as a matrix row, zero blank intersections, every synonym in the pool covered. Any sampling or class rejection = that agent's run failed, redo it.
3. **Merge the four outputs + restoration sweep** (validated on water 2026-09-01; this step exists because composers launder curation through rejection codes):
   a. Extract every matrix rejection coded D/X whose stated reason mentions redundancy (script: parse each file's matrix tables, row word + column synonym + cell text; write `redundancy-rejections-<element>.txt`). Redundancy is NOT a cut rule — near-duplicates are welcome.
   b. Hand the four files + the extraction to ONE Sonnet merger agent with the six-clause restoration policy: RESTORE redundancy-only rejections; UPHOLD when (1) same-root adjective/noun duplication in the same cell, (2) light-tap synonym (Knock/Rap class) on a broad-mass element word, (3) the reason also cites a genuine definitional ground, (4) identical name already owned in another cell, (5) neutral-pool collision, (6) ratified cut. Every line dispositioned; output a draft with restored names marked ° and a full ledger.
   c. **Tell the merger explicitly: do the work itself, no sub-delegation.** (A merger that spawns its own background child detaches from recall — SendMessage recalls are refused as an unverifiable side channel, and the orphan may overwrite files later. This happened.)
   d. Trust itemized lists over count labels — every composer file had header-count/list-length mismatches. Also cross-check each composer's DISPOSITION TABLE against its flat cell lists: names judged "new keep" in the table but missing from the list are real keeps (Brine Blast, Tide Slam class).
4. **Audit the merged draft yourself** (Fable, never delegated). First run a cross-cell duplicate scan (script: name → list of cells); the merge WILL have placed names in two cells. Resolve by definition: owned placement beats restored; impact verbs (Slam/Bash/Smash) → strike, displacement verbs (Buffet/Barge/Charge) → shove; honor prior placements (grip lives in snare; jet is beam's). Then apply the cut taxonomy:
   - Definition dishonesty: a word may only serve cells its DEFINITION supports (the riptide rule: drag-words serve snare/ambush/shove, never strike/rake/crush/drain; froth cannot strike; rapids cannot ambush; containers cannot crush; sources mend, they do not strike).
   - Borrowed names: any established creature-game or franchise term (Hydro Pump, Deep Strike). When unsure, search memory of major franchises; flag rather than keep.
   - Real-world weapons/military terms (Depth Charge, Torpedo).
   - Earth fauna/flora proper references (Python, Kelp, Coral); flag other-element words to their element.
   - Combining forms standalone (bare Hydro/Chrono/Aqua compounds like "Aqua Ward" die; real-word compounds live).
   - Modern-tech idiom; religious/ritual register is allowed.
   - Neutral leakage: words with no elemental meaning (vapor, balm, tonic) release to neutral pools.
   - Register: too gentle/obscure for combat (drizzle, freshet, fjord); tautologies (Splash Spray).
   - Signature-register: grander-than-catalog names (Font of Renewal) are RELEASED to the signature pool, never kept, never lost.
   - Anatomy-evoking names must carry instrument tags from the ratified registry (34 anatomy keys + 7 channels); prefer cutting borrowed-feeling anatomy names (Abyssal Maw) over tagging them.
   - Canon compliance: nothing implying time reversal, teleportation, creating life, permanent transformation, puppeting, true invisibility.
   - Keep near-duplicates; cut only by the rules above.
   Plus these audit cut families validated on water: three-word phrasal restorations (Knock Down / Bowl Over class — 1-2 word rule); names contradicting a composer's own stated physics elsewhere in its file (foam/whitecap no-mass rulings applied consistently); abstract-verb collocations with no concrete image (Abyssal Intimidate class); verb-final awkwardness (Current Deflect precedent); homonym say-aloud fails (the Console trio — the game's UI is literally a console).
5. **Write `consolidated-<element>.md`**: header (pipeline + philosophy note), all 16 cells with counts, dual cross-refs (a dual-tagged name lives in ONE file and is cross-referenced by the other — never re-owned), instrument tags inline, the full audit ledger (every cut with reason), pending-Nick rulings section, pointer to the composed files' matrices and the draft's restoration ledger. Build the file by script from parsed cell lists (1,000+ names hand-copied WILL drift); note Windows path gotcha: node's `/tmp` is `C:\tmp`, Git Bash's `/tmp` is not.
6. **Persist results**: copy the element's finished artifacts into the repo at `docs/ability-catalog/` on the `data/ability-catalog` branch and commit (the `~/.claude/plans` folder is not versioned or backed up). Update memory with the completed status.
7. **Present to Nick INLINE** (never link-only): all cells in compact dot-separated form, total counts, notable cuts with reasons, the lexicon-vs-cells layer note, and any pending rulings as DIRECT questions ("How do you want to place X?"), never referred-to obliquely. End with the mandatory State/Next block.
8. **After Nick's rulings**: fold amendments into the consolidated file, record any new generalizable ruling in this skill's Standing Rulings section AND in memory, then proceed to the next element only on his go (explicit-approval rule).

## Standing cross-element rulings (append as new ones land)

- Dual medium tags are real but rare and definition-audited each way: Tidal Lash + Vortex = water+dark (owned by dark's file); Stasis family = dark+ice; Supernova = dark+light.
- Pending as of 2026-09-01: Squall (recommend air-only), Monsoon (dual defensible), Waterspout (recommend water-dual, hurl).
- One action cell per name, chosen by definition, forever.
- Water is DONE to the v5 bar (consolidated-water.md, 1,066 owned, 2026-09-01) — the process-validation pilot. The dark v2 consolidation (198 names) predates the exhaustive cross and requires a full re-run through the current pipeline; so do the other 11 elements from scratch.
- Reuse water's Section 0 format; each element needs its own Step-0 productive-word list (run a small Step-0-only agent first, then hand its list verbatim to all four composers).
- Neutral pools are a single shared deliverable (`neutral-pools.md`), built once from the action harvests and referenced by every element.

## Presenting to Nick — hard rules (added 2026-09-01 after a violation)

- **Check every composer/auditor "pending" or "unresolved" flag against the Standing Rulings list and memory BEFORE surfacing it.** Composers work from files that may carry stale flags; a ratified ruling re-asked is a serious process failure. Ratified duals as of this writing: Stasis family = dark+ice; Supernova = dark+light (Eclipse precedent); Tidal family + Vortex = water+dark. These and any later ratified rulings are SETTLED — apply them silently.
- **One question at a time, in prose, with full context and a recommendation.** Never bundle multiple rulings into one paragraph of partial questions. If several genuinely-open questions exist, ask the first and hold the rest in the file's pending section until it is answered.
