# Graviclaw Migration — Independent Validation Report

Validator scope: read only `graviclaw.json`, `graviclaw.md`, `graviclaw.encyclopedia.json`; the Graviclaw entry in `lambda/src/json/species.json`; the Grimedes `history` array (9 paragraphs) and `data` block in `lambda/src/json/planets.json`; every `consolidated-*.md` and `neutral-pools.md` in `docs/ability-catalog/` for the collision/reservation check. No other file was read as canon (the `xalian-creature-data-structure.md` reference doc was consulted only for the reserved-name context that surfaced incidentally in the grep of the catalog folder, and is flagged as informational, not treated as an allowed source).

Full text of the allowed Graviclaw source paragraph (species.json), for reference:

> "With the black-shelled body of a crab and an upright torso, the centaur-like crustacean known as the Graviclaw lurks just beneath the foggy wetlands of Grimedes, using its bizarre control over the intensification of gravitational waves to generate miniature black holes in the water and draw its helpless prey right into its clutches. Graviclaws can strengthen the gravitational pull of their massive claws in order to snap them shut with a force many times heavier than their implied mass, severing through even the hardest of materials with crushing pressure. When facing larger foes, the Graviclaw can use its powers to root itself to the ground, becoming an immovable wall of chitin."

Grimedes planet data block: Type Dark, Terrain "Flat Land, Thick Stalky Undergrowth, Ominous Haze", Temperature Low "-6 °C / 21.2 °F", Temperature High "93 °C / 199.4 °F". Grimedes `history` (9 paragraphs) covers: perpetual night / dying brown dwarf emitting only infrared, a nearby black hole, remote/sparse Vallerii settlement, ECHELON black-site dark-matter research, the Generator's terraforming via black-leaved photosynthetic undergrowth, Grimedes Xalians built as **test subjects**, gravity/shadow/erasure/time-anomaly powers, the End Wars and Source Code 606, and the Battle of Grimedes / present-day watch duty.

---

## 1. Source-quotation check (graviclaw.md)

| # | Quotation in graviclaw.md | Verdict | Note |
|---|---|---|---|
| 1 | "With the black-shelled body of a crab and an upright torso, the centaur-like crustacean known as the Graviclaw" | SUPPORTED | Verbatim in species.json description, opening clause. |
| 2 | "the foggy wetlands of Grimedes" | SUPPORTED | Verbatim, species-level (describes the Graviclaw's habitat, not a planet-wide claim — the planet's terrain field says "Flat Land, Thick Stalky Undergrowth, Ominous Haze", not "wetlands"; "wetlands" is the species description's own wording). |
| 3 | "Graviclaws can strengthen the gravitational pull of their massive claws in order to snap them shut with a force many times heavier than their implied mass, severing through even the hardest of materials with crushing pressure." | SUPPORTED | Verbatim, species-specific act. |
| 4 | "the Graviclaw can use its powers to root itself to the ground, becoming an immovable wall of chitin." | SUPPORTED | Verbatim, species-specific act. |
| 5 | "lurks just beneath the foggy wetlands of Grimedes" | SUPPORTED | Verbatim, used for `stealthy`. |
| 6 | "surrounded in a cloak of perpetual night" (attributed to Grimedes history, used for `perceptive`) | SUPPORTED but MISAPPLIED AS SPECIES FACT | This is planet-wide narration ("the planet Grimedes is surrounded in a cloak of perpetual night") describing the whole world's lighting condition, not a Graviclaw-specific behavior. Using it to justify a Graviclaw-specific `perceptive` weight is exactly the "planet-wide statement presented as a species fact" pattern the check warns against. It is legitimate as environmental context (ambient light level informs sight/temperature bands), but the walkthrough leans on it as if it were evidence the Graviclaw itself compensates for poor light with perception — that inference is the walkthrough's own, not the source's. |
| 7 | "draw its helpless prey right into its clutches" (repeated, used for `solitary`, `telekinetic`, medium) | SUPPORTED | Verbatim, species-specific. |
| 8 | "unlike most worlds, the Xalians on Grimedes were not intended to serve as a labor force, but as a population of test subjects for experimentation" (quoted in Open Question 1) | SUPPORTED, correctly flagged | This is explicitly and correctly identified in the walkthrough itself as a planet-wide statement not used in the final artifacts — it is raised transparently as an open question, not smuggled into the description. This is the walkthrough doing the check correctly for this one instance. |
| 9 | "A shadowy world that occupies the outer rim of the galaxy of Xalia" / "a dying brown dwarf star that has cooled so significantly it emits almost no visible light" (used for `lifespan: long` reasoning and temperature/light reasoning) | SUPPORTED, but PLANET-WIDE evidence applied to a species-level trait | Same pattern as #6: correct as environmental data (informs temperature/light bands, which are legitimately planet-derived), but "wear rubric" reasoning about metabolic intensity and lifespan is the walkthrough's own inference layered on top of a planet fact, not a stated species fact. Flagged, not a hard fail — the walkthrough is transparent about doing this ("Grimedes opens its history as...", not claimed as a direct species quote). |

All quotations traced are verbatim character-for-character against species.json and planets.json. No fabricated quotation was found. The concern is not textual accuracy but two instances (#6, #9) where planet-wide narration is used as supporting evidence for species-specific trait/attribute weights, without being clearly demarcated from species-specific evidence in the trait tables themselves (Step 3, Step 7). The walkthrough's prose does distinguish "Grimedes history" from "the source description" by naming its source each time, which is good practice, but the pool-trait weight table format flattens that distinction for a reader skimming only the bullet, not the parenthetical.

## 2. Factual clauses in the signature description and Encyclopedia definition

Signature description: "The Graviclaw deepens the pull of its claws until nothing near them can hold its ground, then closes them with a weight its body was never built to carry."

| Clause | Verdict | Source |
|---|---|---|
| "deepens the pull of its claws" | SUPPORTED | "strengthen the gravitational pull of their massive claws" |
| "until nothing near them can hold its ground" | SUPPORTED (interpretive gloss) | Consistent with "generate miniature black holes ... draw its helpless prey right into its clutches", read as the gravity-well/pulling effect. Not a direct quote but a fair paraphrase of the pulling mechanism. |
| "then closes them with a weight its body was never built to carry" | SUPPORTED | "snap them shut with a force many times heavier than their implied mass" |

No em-dashes, no gendered language, no mint/crypto/game-mechanics vocabulary. Clean.

Encyclopedia definition: "The Graviclaw is a black-shelled crustacean Xalian of Grimedes, generated with an upright torso above a crab-like body and an intensifying command of gravitational waves. It hunts from beneath the foggy wetlands by opening miniature black holes in the water to drag prey into its massive claws, and can root itself immovably to the ground when it meets a larger opponent."

| Clause | Verdict | Source |
|---|---|---|
| "black-shelled crustacean Xalian of Grimedes" | SUPPORTED | "black-shelled body of a crab", planet Grimedes |
| "upright torso above a crab-like body" | SUPPORTED | "centaur-like crustacean", "upright torso" |
| "intensifying command of gravitational waves" | SUPPORTED | "bizarre control over the intensification of gravitational waves" |
| "hunts from beneath the foggy wetlands by opening miniature black holes in the water to drag prey into its massive claws" | SUPPORTED | "lurks just beneath the foggy wetlands ... to generate miniature black holes in the water and draw its helpless prey right into its clutches" |
| "can root itself immovably to the ground when it meets a larger opponent" | SUPPORTED | "When facing larger foes, the Graviclaw can use its powers to root itself to the ground, becoming an immovable wall of chitin" |

Both prose fields are fully supported, no contradictions, no invented facts. No em-dashes, no gendered/lineage language, no mechanics vocabulary.

## 3. Field-by-field evidence audit

| Field | Value | Verdict | Note |
|---|---|---|---|
| anatomy: pincers | present | HONEST | "massive claws ... snap them shut" — registry treats crab pincers as `pincers` per the ability-catalog's own anatomy-consolidated.md ruling (confirmed: `anatomy-demand-sweep.md` explicitly lists Graviclaw under `pincers` — "Clean primary match on Graviclaw (crab pincers is the textbook case)"). |
| anatomy: shell | present | HONEST | "the black-shelled body of a crab" — direct. |
| anatomy: hide | present | OVER-CLAIMED (soft) | The species text names a shell, not a separate hide. `anatomy-demand-sweep.md` also lists Graviclaw under `hide` ("crab shell") — but that catalog entry is itself reading "shell" as satisfying "hide," which the template's own Open Question 2 already flags as its softest call. Verdict: authored/inferred, honestly flagged as such by the walkthrough — not a silent overclaim. |
| anatomy: body | present | HONEST | Universal fallback, explicit in source ("becoming an immovable wall of chitin" = whole-body instrument). |
| guaranteed trait: armored | present | HONEST | "black-shelled body", "wall of chitin" is a strong, direct textual basis. |
| guaranteed trait: anchored | present | HONEST | "root itself to the ground, becoming an immovable wall" is as close to a definitional match as trait-sourcing gets. |
| pool trait: stealthy (4) | present | HONEST | "lurks just beneath the foggy wetlands" is concealment-before-action, textbook stealthy evidence. |
| pool trait: perceptive (3) | present | OVER-CLAIMED | No sense organ or detection capability is described anywhere in the source. The walkthrough's own justification concedes this ("the source never says it detects hidden things, only that it hunts") and leans on planet-wide "perpetual night" narration to manufacture a need for perception. This is an inference stacked on planet-wide (not species) evidence — the weakest-supported pool trait in the set. |
| pool trait: solitary (3) | present | HONEST-ish, but based on absence | Correctly identified by the walkthrough as argument from absence ("never a pack") rather than a stated fact — honestly caveated as weaker than a guaranteed trait, and correctly excludes `pack-bonded` as a live pool member. Reasonable, but should be read as "not contradicted" rather than strongly "supported." |
| pool trait: menacing (2) | present | OVER-CLAIMED (weak, self-flagged) | Walkthrough concedes "nothing in the source says its presence erodes courage." Low weight is the honest hedge; still an authored trait with no textual anchor beyond general size/menace vibe. |
| pool trait: telekinetic (1) | present | SUPPORTED (defensible) | "control over the intensification of gravitational waves ... draw its helpless prey" is action-at-a-distance without contact — a fair reading of telekinetic, kept at the rarest weight, appropriately hedged as a hunting mechanism rather than general levitation. |
| instrument: pincers | present | SUPPORTED | Direct — "massive claws ... snap them shut". |
| instrument: shell | present | SUPPORTED | Direct — defensive shell use implied by "wall of chitin" framing plus "black-shelled body". |
| instrument: body | present | SUPPORTED | Direct — "becoming an immovable wall of chitin" is whole-body. |
| communication: vibration | present | UNSUPPORTED (authored) | No sound, vibration, or signaling behavior is described anywhere in the source. This is invented to fill the required field, honestly, but the source gives zero textual basis — worse-supported than the pool traits above it. |
| communication: display | present | UNSUPPORTED (authored) | Same — "massive claws" affording visual display is the walkthrough's own inference; nothing in the source frames the claws as a display/signaling structure (they are described purely as weapons). |
| diet: carnivore | present | SUPPORTED | "draw its helpless prey right into its clutches" directly implies eating prey. |
| breathes: gas, liquid | present | SUPPORTED | Submerged hunting ("beneath the foggy wetlands", "in the water") plus facing "larger foes" above water is a fair dual-medium reading. |
| ambientMedia: gas, liquid | present | SUPPORTED, structurally valid | Same evidence; breathes is a subset of ambientMedia (equal sets here, which satisfies the subset constraint). |
| temperatureC: [-40, 15] | present | CONTRADICTED by allowed planet data | The Grimedes planet `data` block (an allowed source under this task's Grimedes-history scope, and the only quantitative temperature figure available) states Temperature Low "-6 °C" and Temperature High "93 °C". The template's band of -40 to 15 does not overlap the planet's stated high at all, and undershoots the stated low by 34 degrees on the cold end. The walkthrough never cites or reconciles this data-block figure; it derives its band purely from qualitative narrative ("cooled so significantly it emits almost no visible light") and the wetlands being liquid rather than ice. Whether the walkthrough's mandate was history-only (its own header says "the full `history` array," not the `data` block) is a scope question, but as written, the temperature band is not supported by — and arguably contradicts — the one authoritative quantitative figure Grimedes provides. This is a genuine discrepancy, not a hedge. |
| special sense: tremorsense | present | UNSUPPORTED (authored, self-flagged) | Correctly flagged by the walkthrough itself as authored (Open Question 3) — no sense organ is named in the source at all. Honest about the gap. |
| lifespan: long | present | SUPPORTED (inference, reasonably argued) | Built from planet-wide "dying brown dwarf ... emits almost no visible light" (low energy input) rather than any species-specific longevity statement — again planet-wide evidence used for a species field, but reasonably argued and transparently sourced. |
| composition.primary: flesh | present | SUPPORTED | Reasonable default; chitin correctly kept out of composition and placed in `covering` instead. |
| manipulation [45,65] | present | STRUCTURALLY VALID | Grasping anatomy (pincers) present, but the band's upper bound (65) does not exceed 40 in a way requiring justification beyond the pincers — fine either way; no violation. |

## 4. Signature ability check

**Reservation claim:** graviclaw.md states the search over `consolidated-*.md`/`neutral-pools.md` found one hit — a ratified ledger note in `consolidated-dark.md` line 52. Verified independently: `consolidated-dark.md:52` reads (in full):

> "Ratified cuts verified still cut: Gravity Anchor, Anchor Snare, bare Chrono, time-reversal implications, Dense Wallop, Singularity Fling, Warp Tangle, Void Rake, Gravity Rake, Leaden Blow, Void Torrent, Void Ebb, Abyssal Presence, Void Miasma, Entropy Murk, Gravity Haze, Nova standalone, Void Bastion, Warp Deflect, Time Rally, Inertial Recovery, Gravity Settle. **Point of No Return remains signature-register (Graviclaw's signature).**"

CONFIRMED — the reservation claim is accurate and the quote is correct. No collision was found in any dark-cell name list in `consolidated-dark.md`'s cells section either (checked "crush" and "snare" cells directly — "Point of No Return" does not appear as a cell entry anywhere, consistent with it being held out of cells per the standing ruling).

**Action choice (crush vs. snare) — adversarial judgment, per the task's own framing:**

The two competing readings from the source paragraph are:
1. "using its bizarre control over the intensification of gravitational waves to generate miniature black holes in the water and **draw its helpless prey right into its clutches**" — a pulling/trapping act, textually closer to `snare`.
2. "Graviclaws can strengthen the gravitational pull of their massive claws in order to **snap them shut with a force many times heavier than their implied mass, severing through even the hardest of materials with crushing pressure**" — a closing/severing act, textually `crush` (and the template correctly cites "crushing pressure" verbatim as its basis).

Both acts are genuinely in the source and both are legitimate; the question is which one is the *signature*, i.e., the lore-defining act. Two considerations favor `snare` over the template's `crush`:

- The name itself, "Point of No Return," reads as a threshold/inevitability name (the source's own black-hole/gravity-well framing: pull something past a point where escape is impossible), which maps more naturally onto the *pulling-in* act than the *crushing* act. A creature can be crushed without ever having been "past the point of no return" in the way that phrase evokes; being pulled inexorably toward the claws is precisely a point-of-no-return event.
- The catalog itself independently supports a snare reading: `snare (85)` in `consolidated-dark.md` includes "Event Horizon," "Gravity Well," "Singularity," "Accretion," "Gravity Snare," "Gravity Bind," "Void Snare" — the exact black-hole/gravity-well vocabulary the Graviclaw's paragraph uses ("miniature black holes," "draw ... into its clutches"). The `crush (129)` cell is built from compression/pressure vocabulary (Gravity Crush, Mass Compression, Gravity Squeeze, etc.), which matches the second sentence's "crushing pressure" reasonably well too, so this is not dispositive alone — but combined with the name, the balance tips toward `snare`.

Verdict: this is a genuine, arguable judgment call as the task frames it, not a hard error — `crush` is defensible from the second sentence's "crushing pressure" being quoted verbatim and correctly. But the stronger reading, on the combined evidence of (a) the ability's own name and (b) the paragraph's lead clause being the pulling/black-hole mechanism rather than the closing mechanism, is `snare`. Recommend flagging to Nick as a judgment call to confirm rather than silently accepting `crush`.

Other signature fields:
- `instrument: pincers` — SUPPORTED, matches source and registry ("their massive claws in order to snap them shut").
- `medium: dark` — SUPPORTED, matches species primary element (Dark, per species.json `"type": "Dark"`).
- `intensity: [55, 95]` — reasonable band from "many times heavier than their implied mass" and "even the hardest of materials"; not falsifiable against a hard source number, no violation.

## 5. Structural constraints

| Constraint | Result |
|---|---|
| breathes ⊆ ambientMedia | PASS — both are `["gas", "liquid"]`. |
| guaranteed.length + rolledCount[1] ≤ 3 | PASS — 2 + 1 = 3. |
| guaranteed.length + rolledCount[0] ≥ 1 | PASS — 2 + 0 = 2. |
| no pack-bonded co-occurring with solitary | PASS — pack-bonded is absent from the pool entirely; solitary is present alone. |
| every physical instrument appears in anatomy | PASS — pincers, shell, body are all in `anatomy: ["pincers", "shell", "hide", "body"]`. |
| manipulation upper bound > 40 only if grasping anatomy present | PASS — pincers present, manipulation band [45, 65]. |
| signature medium is dark/ghost/psychic/ice | PASS — medium is `dark`. |
| trait keys from the 24-key registry | PASS — armored, anchored, stealthy, perceptive, solitary, menacing, telekinetic are all valid registry keys per the list supplied in the task. |
| archetype keys from the 16-key registry | PASS — bulwark, juggernaut, predator, prowler, stalwart are standard archetype keys. |
| all keys/enum values lowercase | PASS — spot-checked every field; all lowercase. |

No structural violations found.

## 6. Canon compliance

- No gendered pronouns, mates, offspring, or lineage language anywhere in graviclaw.json, graviclaw.md, or graviclaw.encyclopedia.json. PASS.
- No spoken language implied — communication is vibration/display only, no `vocal`. PASS.
- No teleportation, invisibility, puppeting, time reversal, life creation, or permanent transformation claimed. The `telekinetic` trait and the gravity-well signature stay within "pull things toward it," never full levitation/telekinetic manipulation of arbitrary objects, and never teleportation. PASS.
- No mint/crypto vocabulary anywhere. PASS.
- No game mechanics (no HP, damage numbers, cooldowns) or raw element keys inside prose fields (the description and encyclopedia definition never say the word "dark" as a game-type label). PASS.
- No em-dashes in any prose field (description, biomeNiche, signature description, encyclopedia definition) — checked character by character, none found. PASS.

## 7. Adversarial scan — judgments not supported by the source

Listed in descending order of how confidently the source fails to support the claim:

1. **communication: ["vibration", "display"]** — zero textual basis. The source describes no sound, no signal, no display behavior. This is invented to satisfy the schema's "explicit-none" requirement (communication must always have an answer), which is a legitimate schema-compliance reason to author *something*, but the specific choices (vibration and display, rather than e.g. `[]` for mute) are unsupported guesses dressed as sourced reasoning ("a heavy shelled body in wetland mud communicates by vibration" is authorial world-building, not textual evidence).
2. **special sense: tremorsense** — self-flagged by the walkthrough as authored (Open Question 3), so not a silent overclaim, but it is asserted as fact in the JSON record (`"special": ["tremorsense"]`) with no in-record flag distinguishing it from sourced fields. A downstream consumer of the JSON alone (not the walkthrough) would read it as equally certain as `diet: carnivore`.
3. **pool trait perceptive (weight 3)** — built on planet-wide "perpetual night" narration reinterpreted as an implicit species need, not a stated species behavior. This is the clearest instance of planet-wide evidence smuggled toward a species-specific numeric weight, though the walkthrough discloses its reasoning rather than hiding it.
4. **temperatureC band [-40, 15]** — as detailed in Section 3, this actively sits below and does not overlap the planet's own quantitative Temperature Low/High figures ("-6 °C" / "93 °C") in the allowed `data` block. This is the one finding in this report that looks less like an inference call and more like an outright numeric contradiction against available source data, and it was not addressed or reconciled anywhere in the walkthrough.
5. **hide as a fourth anatomy key distinct from shell** — self-flagged (Open Question 2) as the softest call in the anatomy set; a single-carapace crustacean plausibly has only one surface (shell), and treating "wall of chitin" as evidence for a second, distinct `hide` key is a stretch the walkthrough itself doubts.
6. **signature action "crush" over "snare"** — as detailed in Section 4, defensible but not the strongest reading; the ability's own reserved name and the paragraph's lead clause both point toward the pulling/gravity-well act, which is `snare`, more than the closing/crushing act.
7. **lifespan: long** — reasoned entirely from planet-wide stellar/energy narrative (a dying, dim star implying low metabolic demand) rather than any species-specific longevity statement. A defensible inference, but again planet-wide evidence extended into a species-specific field without a clear textual anchor at the species level.

None of items 1-7 are fabricated quotations or contradicted facts in the strict sense (no quotation was altered or invented) — they are judgment calls, several of them self-disclosed by the walkthrough's own open questions. The walkthrough's practice of flagging its own weakest inferences (Open Questions 1-3) is good practice and should be credited; it caught 2 of the 7 items above (tremorsense, hide) itself. It did not catch the temperature contradiction (item 4) or clearly separate planet-wide from species-specific evidence in the pool-trait and lifespan reasoning (items 3, 7).

---

## Verdicts

**Template (graviclaw.json): FAIL (conditional)** — structurally sound and no fabricated or contradicted quotations, but the temperature band `[-40, 15]` does not overlap and is not reconciled against the allowed planet data block's stated range (-6 °C to 93 °C), which is a factual discrepancy against source data available for the check, not merely a soft inference. Additionally `communication` and the special sense are unflagged-in-JSON authored content presented with the same confidence as sourced fields. Recommend: reconcile or justify the temperature band against the Grimedes data block, and reconsider signature `action` (crush vs. snare) with Nick before treating this as ratified.

**Walkthrough (graviclaw.md): PASS (with flags)** — every quotation checked was verbatim and accurately attributed; the walkthrough is transparent about its own weakest inferences via three open questions, and correctly distinguishes "source" language from its own reasoning in most places. It does not surface the temperature contradiction against the planet's `data` block, and in a few places (perceptive, lifespan) uses planet-wide narrative as if it were closer to species evidence than it is, without a clear caveat at the point of use (the caveats exist but are easy to miss in the trait-weight bullet format).

**Encyclopedia entry (graviclaw.encyclopedia.json): PASS** — every clause is directly and clearly supported by the source description; no invented facts, no canon violations, no em-dashes, no mechanics language.
