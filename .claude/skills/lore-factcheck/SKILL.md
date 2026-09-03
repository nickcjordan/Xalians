---
name: lore-factcheck
description: Independent claim-by-claim verification of any Xalians lore text (tour beats, encyclopedia entries, species prose, chronicle summaries) against the canon sources before it ships. Nick does not fact-check lore himself; this gate replaces that review for accuracy.
---

# Lore fact-check

Nick's ruling (2026-09-03): he will not fact-check lore. Every lore text that is derived from or added to the canon passes this gate before it is committed, and the orchestrator reports what was checked and what changed. Taste and direction remain Nick's; accuracy against the sources is ours.

## What counts as lore text

Anything a reader will take as canon: `docs/encyclopedia/tour.json` beats, `docs/encyclopedia/encyclopedia.json` definitions, species `lore` blocks in `docs/species-templates/`, event titles and paragraph summaries in `docs/encyclopedia/chronicle.json`, era definitions, and any UI copy that states a fact about the galaxy.

## Sources, in precedence order

1. `lambda/src/json/planets.json` histories (read with `node -e`, per planet, per paragraph).
2. `docs/encyclopedia/encyclopedia.json` entries.
3. `docs/design/xalian-chronicle.md` rulings (chronology: undated; the Magmuth Massacre inside the Accords era, months before APEX turns; Source Code 606 triggered by the failure at Grimedes, delivered through the Veridium Generator, incomplete).
4. `docs/encyclopedia/ENCYCLOPEDIA-INTERNAL.md` constraints (never resolve the ancient-presence thread; Xalians are sexless and speechless; no NFT framing).

## Procedure

1. **Run the structural validator first.** `yarn test --run -t tour` from `my-app/` (`src/lore/__tests__/lore.tour.test.js`): sources resolve, entries exist, no em-dashes, no four-digit numbers, word bands, banned words. Fix failures before reading further.
2. **Spawn an independent checker** (a Sonnet subagent that changes no files) with this brief: split each text into atomic claims (actor, action, place, cause, sequence, quantity, motive); for each claim find and quote the supporting source sentence; classify SUPPORTED, PARAPHRASE, UNSUPPORTED, or CONTRADICTED (with the contradicting quote). Be strict: plausible is UNSUPPORTED. Pay special attention to causal links the source does not draw, sequence words, quantities, motives attributed to actors, superlatives, and anything that resolves an open mystery. Ask for every beat whose `sources` list omits a paragraph it relies on.
3. **Fix or cut.** Every UNSUPPORTED claim is rewritten to what the source says or removed; every CONTRADICTED claim is corrected; PARAPHRASE stays. Add missing `sources`. Never fix by inventing a softer claim that is still unsourced.
4. **Re-run** the validator and, if more than a sentence changed, the checker on the changed text.
5. **Bundle and copy** (`node scripts/bundleLore.js`, `yarn copy-json`), commit, and report to Nick: texts checked, claim counts per class, what was changed, in prose. Do not ask him to verify.

## Writing rules that prevent most failures

- Restate; never synthesize a cause the source leaves implicit.
- No numbers unless the source gives them (the histories give a few: "over a hundred thousand", "thousands of years").
- No "same afternoon", "within a day", "decades" unless quoted.
- Name the source's actor; do not upgrade "corporations" to "ECHELON" or "the Vallerii" to "the Thousand Families" unless the paragraph does.
- Keep hedges the source uses ("rumor has it", "some say") on deep-past material.
