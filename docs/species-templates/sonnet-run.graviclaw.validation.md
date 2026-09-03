# Graviclaw migration validation report

Validator: independent audit agent. Allowed sources only: Graviclaw entry in `C:\dev\src\Xalians\lambda\src\json\species.json`, the Grimedes `history` array in `C:\dev\src\Xalians\lambda\src\json\planets.json`, and the `consolidated-*.md` / `neutral-pools.md` files in `C:\dev\src\xalians-catalog\docs\ability-catalog\` for the collision check only. No CLAUDE.md, canon.md, voice.md, design docs, memory, or other species templates were read.

## Verdicts

- **Template (`graviclaw.json`): PASS** — all structural constraints hold; one flagged item (signature name vs. catalog's own reserved name) is a design-fit concern, not a structural violation.
- **Walkthrough (`graviclaw.md`): FAIL** — contains one misquoted source fragment presented in quotation marks as if verbatim (`"bend space and time"` vs. actual `"bending space and time"`), and that fragment is also misapplied as species-specific evidence when the source sentence describes Grimedes Xalians generally, not the Graviclaw.
- **Encyclopedia entry (`graviclaw.encyclopedia.json`): PASS** — all factual clauses are supported paraphrase, no invented facts, no canon violations.

---

## 1. Source quotations in graviclaw.md checked verbatim against allowed sources

| # | Quoted fragment (from graviclaw.md) | Verdict | Source sentence |
|---|---|---|---|
| 1 | "the black-shelled body of a crab and an upright torso" | SUPPORTED | species.json description, sentence 1 (verbatim match) |
| 2 | "the centaur-like crustacean known as the Graviclaw" | SUPPORTED | species.json description, sentence 1 (verbatim match) |
| 3 | "black-shelled body," "an immovable wall of chitin" | SUPPORTED | species.json description, sentences 1 and 3 (verbatim match) |
| 4 | "Graviclaws can strengthen the gravitational pull of their massive claws in order to snap them shut" | SUPPORTED | species.json description, sentence 2 (verbatim match) |
| 5 | "draw its helpless prey right into its clutches" | SUPPORTED | species.json description, sentence 1 (verbatim match) |
| 6 | "lurks just beneath the foggy wetlands... in the water" | SUPPORTED (elided) | Both fragments are verbatim substrings of species.json sentence 1: "...lurks just beneath the foggy wetlands of Grimedes..." and "...generate miniature black holes in the water..." The ellipsis correctly signals a non-contiguous splice; neither half is altered. |
| 7 | "root itself to the ground" | SUPPORTED | species.json description, sentence 3 (verbatim match) |
| 8 | "the Graviclaw can use its powers to root itself to the ground, becoming an immovable wall" | SUPPORTED | species.json description, sentence 3 (verbatim match) |
| 9 | "a shadowy world... cloak of perpetual night" | SUPPORTED (elided, case-normalized) | Grimedes history[0]: "A shadowy world that occupies the outer rim of the galaxy of Xalia, the planet Grimedes is surrounded in a cloak of perpetual night." The walkthrough lower-cases the sentence-initial "A" to "a" for mid-sentence embedding — a standard quotation convention, not a content change. Flagged for completeness, not scored as a failure. |
| 10 | "almost no visible light other than the shortest bands of infrared radiation" | SUPPORTED | Grimedes history[0] (verbatim match) |
| 11 | "bend space and time" | **CONTRADICTED** | Grimedes history[6] reads: "Xalians that could alter the gravitational waves around them, in effect **bending** space and time to create self-contained black holes." The walkthrough presents "bend space and time" inside quotation marks as if it were an exact quotation; the actual verb form is "bending," not "bend." This is a genuine misquotation, not a paraphrase (paraphrases were not put in quotes elsewhere in the document; this one was). |
| 12 | "control over the intensification of gravitational waves" | SUPPORTED | species.json description, sentence 1 (verbatim match) |
| 13 | "using its bizarre control over the intensification of gravitational waves to generate miniature black holes in the water and draw its helpless prey right into its clutches" (signature ability quote) | SUPPORTED | species.json description, sentence 1 (verbatim match) |
| 14 | "cannot be moved against its will" (gloss of `anchored` trait definition) | N/A — not a source quotation | This is presented as the trait's own definition gloss, not attributed to species.json or planets.json. Not checked against the two allowed sources since it is not claimed as sourced from them. |

**Finding:** Item 11 is the one failing quotation. Everything else verified verbatim.

---

## 2. Factual clauses in the signature description and Encyclopedia definition

### Signature ability description
"The Graviclaw thickens the gravity around itself into a well beneath the wetland's surface, and whatever wades too close is drawn down into its clutches before it ever sees the claws waiting there."

| Clause | Verdict | Evidence |
|---|---|---|
| Thickens/intensifies gravity around itself | SUPPORTED | "using its bizarre control over the intensification of gravitational waves" |
| Effect is beneath the wetland's surface / in the water | SUPPORTED | "lurks just beneath the foggy wetlands," "generate miniature black holes in the water" |
| Draws prey down/inward | SUPPORTED | "draw its helpless prey right into its clutches" |
| Prey does not see the claws coming (implied ambush framing) | SUPPORTED (reasonable inference) | "lurks" (concealment) + "draw its helpless prey right into its clutches" (prey is drawn in, not choosing to approach) together support an ambush framing where the claws are the concealed payload; the "before it ever sees" phrasing is original combat-flavor prose, not a direct quotation, and does not contradict anything in source. |

### Encyclopedia definition
"A dark-element Xalian of Grimedes, the Graviclaw is a chitin-armored, crab-bodied ambush predator that lurks beneath the planet's wetlands, thickening gravity into a snaring well to draw prey into its crushing claws. It can also anchor itself against its will being moved, standing as an immovable wall of shell when confronted by larger foes."

| Clause | Verdict | Evidence |
|---|---|---|
| dark-element Xalian of Grimedes | SUPPORTED | species.json: `"type": "Dark"`, `"planet": "Grimedes"` |
| chitin-armored | SUPPORTED | "an immovable wall of chitin" |
| crab-bodied | SUPPORTED | "the black-shelled body of a crab" |
| ambush predator | SUPPORTED (reasonable characterization) | "lurks," "draw its helpless prey right into its clutches" — text does not use the word "ambush" but the behavior described is definitionally ambush predation |
| lurks beneath the planet's wetlands | SUPPORTED | "lurks just beneath the foggy wetlands of Grimedes" |
| thickening gravity into a snaring well to draw prey into its crushing claws | SUPPORTED | composite of "intensification of gravitational waves to generate miniature black holes," "draw its helpless prey right into its clutches," "snap them shut with a force... severing through even the hardest of materials" |
| can anchor itself against its will being moved | SUPPORTED | "the Graviclaw can use its powers to root itself to the ground, becoming an immovable wall" |
| standing as an immovable wall of shell when confronted by larger foes | SUPPORTED | "When facing larger foes, the Graviclaw can use its powers to root itself to the ground, becoming an immovable wall of chitin" ("shell" is a fair synonym for "chitin," both describing the same hard body covering) |

No unsupported or contradicted clauses found in either the signature description or the Encyclopedia entry.

---

## 3. Field-by-field source honesty check (template)

| Field | Value | Verdict | Notes |
|---|---|---|---|
| corporeality | corporeal | SUPPORTED | Explicitly a physical crab/claw creature; nothing suggests non-corporeal form |
| composition.primary | flesh | SUPPORTED | "upright torso" implies organic body under the shell |
| composition.secondary | mineral | SUPPORTED (as closest fit, honestly reasoned) | No literal "mineral" claim in text; walkthrough explicitly flags this is the closest enum fit for "black-shelled"/chitin since no chitin composition option exists. Reasoning is transparent, not overclaimed. |
| bodyPlan | multiped | SUPPORTED (interpretive, flagged) | "centaur-like crustacean" with "a crab" body — text does not give an exact leg count. Walkthrough treats this as an open question (see Open Questions #2), not a hidden assumption. Reasonable reading of "crab" body plan. |
| anatomy | [claws] | SUPPORTED | "massive claws" stated explicitly and repeatedly; no other body part is named in the text |
| covering | chitin | SUPPORTED | "black-shelled body," "wall of chitin" — chitin stated outright |
| size (height/weight bands) | [175,210]cm / [190,240]kg | SUPPORTED (banded from legacy values per stated methodology) | Legacy: 191cm/211kg; bands are symmetric-ish around that midpoint, consistent with rule 0.6 cited in the walkthrough |
| lifespan | long | SUPPORTED (interpretive, reasoned) | No direct lifespan statement in source; walkthrough's "wear rubric" reasoning (armored, sedentary/ambush lifestyle, non-abrasive wetland niche) is plausible but not textually verifiable — properly an inference, not overclaimed as a quotation |
| genome.chirality | rolled | UNSUPPORTED but explicitly flagged as default | Walkthrough states "No species-level override stated; default." Honest — not claimed as sourced. |
| diet | carnivore | SUPPORTED | "draw its helpless prey right into its clutches" implies predation/consumption |
| communication | [] | SUPPORTED | No calls, cries, or displays described anywhere in the text; walkthrough correctly treats absence as absence rather than inventing a channel |
| breathes | [gas, liquid] | SUPPORTED, see also check 7 below | "lurks just beneath the foggy wetlands," "in the water" support liquid; "foggy" (surface air) supports gas |
| ambientMedia | [gas, liquid] | SUPPORTED | Matches breathes; same evidence |
| temperatureC | [-5, 15] | SUPPORTED (reasoned from planet history) | Grimedes described as sunless, near-lightless, cold ("dying brown dwarf star," "almost no visible light"); planets.json `data` block separately states "Temperature Low: -6°C" / "Temperature High: 93°C" as a planet-wide range, which the walkthrough does not cite — its band is narrower and justified instead from the prose history's "cold, sunless" characterization. Not contradicted, but note the walkthrough did not use the planet's own explicit numeric temperature range (which runs far higher, to 93°C) and instead derived a band from qualitative prose. This is a defensible niche-based narrowing, not a contradiction, but worth flagging as a source not used. |
| capabilities.flight | [0,0] | SUPPORTED | No wings/flight mentioned |
| capabilities.swim | [40,65] | SUPPORTED | "in the water," "foggy wetlands" — aquatic capability stated |
| capabilities.burrow | [10,30] | SUPPORTED (interpretive) | "root itself to the ground" implies ground engagement but is explicitly anchoring, not burrowing; walkthrough is honest that this is an inference ("implies some ground-engaging capability short of true burrowing") |
| capabilities.climb | [0,10] | SUPPORTED (absence-based) | Nothing in text supports climbing; reasonable default-low |
| capabilities.sprint | [10,25] | SUPPORTED (absence-based) | No speed/chase behavior described; ambush framing argues against high sprint |
| capabilities.leap | [0,10] | SUPPORTED (absence-based) | No leaping described |
| capabilities.manipulation | [45,70] | SUPPORTED | Claws described as capable of forceful, precise closure ("snap them shut... severing through even the hardest of materials"); grasping anatomy (claws) present, satisfying the >40 constraint |
| senses.sight | [20,40] | SUPPORTED (reasoned) | Grimedes near-lightless per planet history; ambush-by-feel framing is inference but consistent |
| senses.hearing | [30,50] | SUPPORTED (reasoned, modest) | No direct textual claim; plausible default alongside low sight |
| senses.smell | [40,60] | SUPPORTED (reasoned) | No direct textual claim for smell specifically; walkthrough's own reasoning ("tracking prey in murky wetland water") is speculative, not text-grounded — an inference correctly not presented as a quotation |
| senses.special | void-sense | **OVERCLAIMED (quotation issue)** | See check 1, item 11. The justification quotes "bend space and time" as if directly sourced, misquoting "bending" as "bend," and applies a *general Grimedes-Xalians* statement (history[6]: "Xalians that could alter the gravitational waves around them...") as if it specifically characterizes the Graviclaw. The species' own "control over the intensification of gravitational waves" is a stronger and actually-species-specific basis for void-sense and would have supported the same conclusion without the misquote. The trait conclusion (void-sense) is plausible and arguably fine on the species' own text alone, but the cited supporting evidence is faulty. |

---

## 4. Structural constraints (computed)

| Constraint | Result |
|---|---|
| `breathes` ⊆ `ambientMedia` | PASS — both are exactly `["gas","liquid"]` |
| `guaranteed.length + rolledCount[1] <= 3` | PASS — 2 + 1 = 3 |
| `guaranteed.length + rolledCount[0] >= 1` | PASS — 2 + 0 = 2 |
| No pack-bonded with solitary | PASS — neither trait appears anywhere in guaranteed or pool |
| Every physical instrument appears in anatomy | PASS — `claws` is both an instrument and the sole anatomy entry; `aura` is a channel instrument, not a physical one, so no anatomy entry is required for it |
| Aura channel is lore-justified | PASS, with a caveat — see check 7 below for the adversarial read on whether `aura` or a claw-gripping instrument is the better fit |
| Manipulation upper bound (70) > 40 only if grasping anatomy present | PASS — `claws` (grasping) is present in anatomy |
| Signature medium is dark or an on-graph secondary of Grimedes (ghost, psychic, ice) | PASS — medium is `dark`, the primary element itself |
| All guaranteed + pool trait keys are from the 24-key enum | PASS — armored, anchored, menacing, stealthy, perceptive are all valid enum members |
| Archetype keys are from the 16-key enum | PASS — juggernaut, bulwark, stalwart are all valid enum members |

All structural constraints pass.

---

## 5. Canon constraints (prose scan)

Scanned: the template's `lore.description`, the `signatureAbility.description`, and the Encyclopedia `definition` field (the three in-world prose fields).

| Constraint | Result |
|---|---|
| No gendered pronouns (he/him/his/she/her/hers) | PASS — none found |
| No mates, offspring, or lineage language | PASS — none found |
| No spoken language implied | PASS — `communication: []`; no dialogue or language references in prose |
| No teleportation, invisibility, puppeting, time reversal, life creation, or permanent transformation | PASS — the signature power is a localized gravity well/snare, not teleportation or invisibility; no puppeting, time reversal, life creation, or permanent transformation language appears |
| No mint/crypto vocabulary | PASS — none found |
| No game mechanics named in prose | PASS — no HP/stat/damage/buff/cooldown language in any of the three prose fields |
| No em-dashes in prose | PASS for the three in-world prose fields (lore description, signature description, encyclopedia definition) — none contain an em-dash. Note: `graviclaw.md` (the walkthrough/rationale document, not in-world prose) uses em-dashes extensively throughout its own analytical writing. Since the constraint as scoped in this validation task is about "prose" (the in-world descriptive text), and the walkthrough is meta-commentary/reasoning rather than in-world prose, this is not scored as a canon violation — but it is noted for completeness in case the constraint was intended to cover the walkthrough document as well. |

---

## 6. Signature name collision check: "Mireheart Horizon"

Searched all 14 `consolidated-*.md` files and `neutral-pools.md` in `C:\dev\src\xalians-catalog\docs\ability-catalog\`, case-insensitive, for the exact string "Mireheart Horizon" and for "Mireheart" alone.

**Result: no matches found in any consolidated-*.md file or neutral-pools.md.** The walkthrough's collision-scan claim (line 72: "no matches found in either search") is confirmed accurate for the literal string search performed.

**However, a directly relevant finding surfaced during the broader review of `consolidated-dark.md`:** line 52 of that file, in the Fable audit ledger, reads:

> "Ratified cuts verified still cut: ... **Point of No Return remains signature-register (Graviclaw's signature).**"

This is an allowed source (`consolidated-dark.md`) and it explicitly identifies **"Point of No Return"** as Graviclaw's already-reserved/ratified signature-register name in the catalog's own records — not "Mireheart Horizon." The walkthrough's collision check only searched for the string it was about to choose ("Mireheart Horizon") and did not check whether the catalog already had a name on record for this specific species. This is not a name collision in the literal sense (no other species owns "Mireheart Horizon" verbatim), but it is a substantive naming-consistency gap: the catalog's own audit trail treats "Point of No Return" as Graviclaw's settled signature name, and the template ships a different name without acknowledging or reconciling that record. This should be surfaced to Nick before the template is finalized.

---

## 7. Adversarial scan

### Instrument choice: claws (gripping) vs. aura (radiated field) for the signature ability

The walkthrough places the signature ability on the `aura` channel and explicitly considered but rejected using the claws as the delivery instrument. Re-reading the source text with an adversarial eye:

- "Graviclaws can strengthen the gravitational pull of their **massive claws** in order to **snap them shut** with a force many times heavier than their implied mass, severing through even the hardest of materials with crushing pressure."
- "...draw its helpless prey right into its clutches."

The source explicitly ties "the gravitational pull" to the **claws** ("strengthen the gravitational pull of their massive claws"), not to a whole-body radiated field. Read plainly, the sentence says the claws themselves carry an intensified gravitational pull that lets them snap shut with extreme force — the gravity effect and the claw are described as one mechanism, not two. The separate first sentence ("using its bizarre control over the intensification of gravitational waves to generate miniature black holes in the water and draw its helpless prey right into its clutches") is the one that reads as a whole-body/ambient field effect, and this is the sentence the walkthrough actually quotes for the signature ability and for the `aura` justification — which is a reasonable and defensible reading on its own. But the walkthrough's Instruments-section reasoning ("a radiated, whole-body gravitational field effect, not delivered through a named limb (unlike the claws, which are named explicitly for the crushing power)") somewhat overstates the separation between the two sentences: the text as a whole associates the gravity power with the claws twice (sentence 1's black-hole/draw-in effect, and sentence 2's claw-specific "strengthen the gravitational pull of their massive claws"). A strong counter-reading is that the entire gravity power, including the snaring well, is claw-sourced, which would argue for `claws` as the instrument (with a "grip"/"snare" action) rather than `aura`.

That said, the walkthrough's chosen reading is not indefensible — sentence 1 does describe an ambient effect ("in the water," not "with its claws") — and the walkthrough transparently surfaced this exact tension to Nick in Open Question #3, rather than hiding it. **Verdict: the aura choice is a defensible interpretation but not the only one, and the source arguably leans at least as much toward claws-as-instrument as it does toward aura.** This is presented as an open question in the walkthrough, which is the correct way to handle a genuine judgment call — not a violation, but flagged per the adversarial-scan instruction.

### Breathing / ambient media (gas, liquid)

"beneath the foggy wetlands" and "in the water" were checked against the `breathes`/`ambientMedia` choice of `[gas, liquid]`.

- "in the water" directly supports `liquid`.
- "foggy wetlands" supports a gas/air-breathing surface component, but the word "foggy" describes atmospheric visibility/weather, not a direct statement that the creature breathes air. "Lurks just beneath" the wetlands surface (i.e., submerged) is the more literal reading of the creature's habitual position.

The `[gas, liquid]` choice is a reasonable, moderate reading (amphibious ambush predator that submerges to hunt but is not stated to be permanently submerged), and is not contradicted by the source. But note the source never states the creature surfaces or breathes air; "foggy wetlands" is describing the environment's weather/visibility, not the creature's respiration. The `gas` inclusion is an inference from habitat type (wetland = partially terrestrial/amphibious) rather than a direct textual statement about breathing. This is consistent with how the walkthrough itself frames it ("implies an amphibious creature"), which is honest labeling of an inference rather than a misquote — not a failure, but the evidentiary strength for `gas` is weaker than for `liquid`.

### Other judgment calls reviewed and found reasonably scoped

- `bodyPlan: multiped` for "centaur-like crustacean": defensible, explicitly flagged as an open question rather than asserted as certain.
- `composition.secondary: mineral` for "black-shelled"/chitin: explicitly flagged as an enum-fit compromise, not an overclaim.
- `lifespan: long`: inferential but reasonably argued and not textually contradicted.
- Archetype weights (juggernaut/bulwark/stalwart): consistent with the strength/resilience-forward attribute bands and the "immovable wall" framing; no overclaim found.
- Trait pool weights (menacing/stealthy/perceptive): reasoning is transparent about which parts are text-grounded vs. registry-tilt inference (e.g., perceptive's justification is explicitly labeled "minor weight, no direct sensory claim in the text beyond behavior").

---

## Summary of failing items

1. **graviclaw.md, line 29 (senses.special justification):** quotes "bend space and time" — the source (Grimedes history[6]) actually reads "**bending** space and time," and the sentence it comes from describes Grimedes Xalians generally, not the Graviclaw specifically. This is a genuine misquotation presented in quotation marks as verbatim source text. **This is the reason the walkthrough fails.**
2. **graviclaw.md, line 72 (collision scan) / graviclaw.json signatureAbility.name:** the literal string search for "Mireheart Horizon" correctly found no collisions, but `consolidated-dark.md` line 52 shows the catalog's own audit ledger has already reserved **"Point of No Return"** as "Graviclaw's signature" in the signature-register. The walkthrough did not check for or reconcile this existing reservation. Recommend surfacing to Nick before finalizing the name.
3. **graviclaw.md, Instruments section (adversarial finding, not a hard failure):** the aura-vs-claws instrument choice for the signature ability is defensible but the source text arguably supports claws-as-instrument at least as strongly, since "strengthen the gravitational pull of their massive claws" ties the gravity power directly to the claws rather than describing a purely ambient field. The walkthrough already surfaced this to Nick as Open Question #3, which is the correct handling — flagged here per the adversarial-scan instruction, not scored as a template defect.
