# Graviclaw independent validation report

Validator: independent pass per skill section 9. Read ONLY `species.json` (Graviclaw entry), `planets.json` (Grimedes entry, full `history` array and `data` block), the migrate-species skill sections 2/4/5/6, and the ability-catalog `consolidated-*.md` / `neutral-pools.md` files for the collision and reservation check. No summary document, prior template, or design doc was read.

## Step 1: validator script output (verbatim)

```
WARN signature.description.elementkey signature description uses element key word(s) as plain words: water (allowed only as ordinary English, never as a type label)
WARN enc.definition.elementkey      encyclopedia definition uses element key word(s) as plain words: water (allowed only as ordinary English, never as a type label)

0 FAIL, 2 WARN (structurally clean; every WARN must be answered in the walkthrough)
```

The script does not support a `--verbose`/`-v` flag as a real argument (it is treated as a species key and fails with `file.missing` / `source.species` FAILs, which is expected CLI behavior, not a defect). The walkthrough's claimed verbose lines (`ok temperature.planet`, `ok signature.collision`, `ok signature.reserved`, `ok md.quotes 30 of 30`) could not be independently reproduced through a verbose flag; they are taken on the walkthrough's word but independently checked by hand below (temperature, collision, reservation, and a 26-quote spot check, all confirmed — see Steps 2 and 5). **0 FAIL is a real result: script exits clean.**

## Step 2: quotation spot check

Extracted every double-quoted span in `graviclaw.md` (48 spans, well over the 10 minimum, including all six spans over 100 characters, the longest being the 226-character sentence at line 68). All 48 were checked programmatically against the Graviclaw `description` string and the full Grimedes `history` array joined. **Result: 48/48 found verbatim, including the longest ones.** The script's "30 of 30" figure appears to count distinct quotations after dedup; the honest claim holds either way — every distinct quoted span exists verbatim in the sources.

Two spans are not true quotations but a paraphrase incorrectly wrapped in a quote-like construction at line 46: `") and immovability ("` is a fragment of the walkthrough's own prose (`"...bulk (...) and immovability (...)"`), not source text. This is a false positive in my own extraction regex, not a genuine mis-cited quotation, but it is worth noting the walkthrough is not perfectly disciplined about the "double quotes are reserved for verbatim source text" rule (skill section 6.14) since this construction mixes its own words inside quote-adjacent punctuation. Minor, not a factual defect.

## Step 3: factual clause audit — signature description and Encyclopedia definition

| # | Clause | Verdict | Source |
|---|---|---|---|
| 1 | "opens a claw beneath the water" | SUPPORTED | species: "generate miniature black holes in the water" |
| 2 | "collapses the gravitational waves inside it" | SUPPORTED | species: "using its bizarre control over the intensification of gravitational waves to generate miniature black holes" |
| 3 | "until nothing within reach can swim away from the closing grip" | SUPPORTED | species: "draw its helpless prey right into its clutches" (swimming away is a reasonable restatement of "helpless prey" being drawn in; "clutches" = "closing grip") |
| 4 | Encyclopedia: "black-shelled crustacean Xalian of Grimedes, centaur-like in build" | SUPPORTED | species: "With the black-shelled body of a crab...the centaur-like crustacean" |
| 5 | Encyclopedia: "lurks beneath the planet's foggy wetlands" | SUPPORTED | species: "lurks just beneath the foggy wetlands of Grimedes" |
| 6 | Encyclopedia: "intensifies gravitational waves to open miniature black holes in the water" | SUPPORTED | species, as above |
| 7 | Encyclopedia: "draws prey into its massive claws, which snap shut with a force far heavier than their size implies" | SUPPORTED | species: "massive claws...snap them shut with a force many times heavier than their implied mass" |
| 8 | Encyclopedia: "can root itself to the ground as an immovable wall of chitin" | SUPPORTED | species: "root itself to the ground, becoming an immovable wall of chitin" |

No clause in either the signature description or the Encyclopedia entry is UNSUPPORTED or CONTRADICTED. Both stay tightly bound to the source sentence and add no invented facts.

## Step 4: field-by-field audit of graviclaw.json

| Field | Value | Verdict | Note / source |
|---|---|---|---|
| `anatomy: pincers` | present | HONEST | "massive claws" that "snap them shut" on a crab body maps to the registry's explicit pincers rule (5.6: "a crab's...claws that snap shut are pincers, never claws") |
| `anatomy: shell` | present | HONEST | "black-shelled body of a crab" |
| `anatomy: hide` | present | OVER-CLAIMED | See detailed finding below — same one sentence ("wall of chitin") is used to justify both `hide` as anatomy AND as one of only 3 instruments, double-counting a single defensive clause as two separate functional parts |
| `anatomy: body` | present | HONEST (authored, correctly flagged) | Universal fallback, walkthrough discloses it under Authored fields |
| `traits.guaranteed: armored` | present | HONEST | "black-shelled body", "wall of chitin" |
| `traits.guaranteed: anchored` | present | HONEST | "root itself to the ground" is the registry's literal definition of anchored ("cannot be moved against its will") |
| `traits.pool.stealthy: 5` | present | HONEST | "lurks just beneath the foggy wetlands" is a direct match to the registry's stealthy definition |
| `traits.pool.perceptive: 3` | present | PLAUSIBLE / MILD OVER-CLAIM | Nothing in the source describes detection ability; the walkthrough infers it from "the hunting method" (drawing in prey it presumably cannot see). This is an inference stacked on an inference, not a direct behavioral statement. Weighted low (3), which is a defensible hedge, but the source never says the creature perceives concealed prey — it only says it captures prey that comes near |
| `traits.pool.solitary: 3` | present | HONEST (absence-based, correctly caveated) | Walkthrough explicitly notes this is an absence-of-evidence inference and weights it moderately, consistent with the skill's caution about weak absence-based claims |
| `traits.pool.menacing: 2` | present | PLAUSIBLE / WEAK | "an immovable wall...facing larger foes" describes physical resistance, not psychological effect on an opponent's courage (the registry's actual definition of `menacing`: "erodes courage"). No sentence describes an intimidating presence, display, or fear effect. The walkthrough concedes this is a stretch ("the sentence is about physical immobility first") but keeps the weight rather than dropping it |
| `traits.pool.nocturnal: 2` | present | HONEST — correctly avoids the planet-wide trap | Walkthrough explicitly and correctly refuses to cite Grimedes' "perpetual night" (a planet-wide fact) and instead grounds it in "lurks...beneath the foggy wetlands", a low-light submerged niche. This is the one place the walkthrough visibly self-polices against the very violation Step 4(a) asks about |
| `traits.pool.telekinetic: 1` | present | HONEST | "control over the intensification of gravitational waves...draw its helpless prey" is remote force on an object, matching the registry telekinetic definition; correctly kept at the rare weight (1) rather than promoted |
| `composition: flesh/mineral` | present | HONEST | chitin casing over a body is a reasonable flesh+mineral read |
| `bodyPlan: multiped` | present | HONEST | "centaur-like crustacean" implies more than 2 legs under an upright torso |
| `covering: chitin` | present | HONEST | "wall of chitin", stated outright |
| `size: heightCm [165,215]` | present | HONEST | anchored on the legacy 191 cm figure per skill guidance (legacy height is a fair anchor) |
| `size: weightKg [180,260]` | present | UNSUPPORTED (correctly disclosed) | No source sentence states mass; walkthrough discloses this under Authored fields as required. The reasoning ("massive claws", "immovable wall") is plausible but the number itself is authored, and it is honestly labeled as such |
| `lifespan: long` | present | PLAUSIBLE | Uses the wear rubric correctly (heavy, armored, cold, mineralized casing → slow wear) but leans on "Grimedes is a world on the verge of death" for the not-`enduring` half of the argument, which is a planet-wide sentence about the star system's fate, not the species' habitat harshness. This is a mild version of the planet-wide-sentence problem: the sentence describes astronomical doom (star dying, planet may become rogue), not day-to-day field harshness for a wetland lurker, so it is a weaker link than the walkthrough presents it as |
| `genome.chirality: rolled` | present | HONEST | default, correctly disclosed |
| `diet: carnivore` | present | HONEST | "draw its helpless prey right into its clutches" |
| `communication: []` | present | HONEST | no source sentence supports any channel; correctly left empty and disclosed |
| `breathes: [gas, liquid]` | present | PLAUSIBLE, borderline OVER-CLAIMED | See Step 4(a)/(f) discussion — this rests on stitching together two separate clauses ("in the water" and "beneath the foggy wetlands") that were never asserted to co-occur for the creature's respiration specifically; the walkthrough itself flags this as its one open question, which is the honest move |
| `environmentalTolerance.ambientMedia: [gas, liquid]` | present | Same as above | same evidence |
| `temperatureC: [-6, 34]` | present | PARTIALLY JUSTIFIED — see Step 4(e) | -6 matches the planet's stated low exactly ("Temperature Low: -6 °C"); 34 is unjustified against the planet data or history by any quoted sentence — see detailed finding |
| `capabilities.flight: [0,0]` | present | HONEST | no flight support anywhere |
| `capabilities.swim: [45,70]` | present | HONEST | "in the water", "beneath the...wetlands" |
| `capabilities.burrow: [50,75]` | present | PLAUSIBLE | "lurks just beneath the foggy wetlands" is read as burrowing under a surface; a fair but not certain reading — "beneath the wetlands" more directly describes being submerged under water/fog cover than digging into substrate |
| `capabilities.climb/leap: [5,20]` | present | HONEST (authored, disclosed) | correctly flagged in Authored fields |
| `capabilities.sprint: [15,35]` | present | HONEST | ambush-hunting method implies low sprint need |
| `capabilities.manipulation: [45,70]` | present | HONEST | pincers anatomy justifies the >40 rule |
| `senses.sight/hearing/smell` | present | HONEST | hearing/smell correctly disclosed as authored baselines; sight correctly lowered given submerged/fog hunting |
| `senses.special: [void-sense]` | present | UNDISCLOSED AUTHORED INFERENCE — see Step 4(d) | Not listed in Authored fields despite resting on an inference, not a direct sentence |
| `instruments: [pincers, shell, hide]` | present | `hide` OVER-CLAIMED — see Step 4(c) | |
| `archetypeWeights` | juggernaut 5, bulwark 4, predator 3, vanguard 2, stalwart 1 | HONEST, `stalwart` correctly disclosed as a minority read | reasonable weighting order given the source's emphasis on force and immovability over speed |
| `attributes` | all ten bands | HONEST | consistent with source emphasis on strength/resilience over agility/charisma; `charisma` correctly disclosed as absence-based |
| `signatureAbility` | name/instrument/action/medium/intensity/description | HONEST | matches the ratified ledger entry exactly; instrument classification (pincers, not mind/aura) is argued correctly per the skill's own termination-point rule (section 6.10) |

### (a) Does any weight/behavior rest on a planet-wide sentence rather than a species sentence?

Mostly no, with one soft exception. The walkthrough is explicitly careful about this trap for `nocturnal` (correctly refuses the "perpetual night" planet fact) and for temperature (correctly uses the planet `data` block, which the skill explicitly permits for environment/temperature). The one place a planet-wide sentence leaks into a non-environmental judgment is `lifespan: long`, where "Grimedes is a world on the verge of death" (a sentence about the star system's astronomical fate, not the species' physiology or field conditions) is used as half the justification for ruling out `enduring`. The skill's rule is explicit: "a planet-wide sentence may justify environment, temperature, and lifespan, never a species trait weight or a behavior" — lifespan is explicitly whitelisted for planet-wide sentences, so this is technically permitted, but the specific sentence chosen (about orbital doom, not day-to-day harshness) is a weak fit for the "home-world harshness" wear-rubric factor it's cited for.

### (b) Does Authored fields list EVERY value with no source sentence?

**No — it misses `senses.special: [void-sense]`.** The walkthrough's own text at line 54 concedes the special sense "requires it to perceive gravitational structure it is itself shaping" — this is the walkthrough's own inference layered on top of the black-hole-generation sentence, not a sentence that states the creature perceives anything. No source sentence anywhere describes Graviclaw sensing, detecting, or perceiving gravity, void, or anything else. This should have been listed in Authored fields alongside `hearing`/`smell`, and it is the single genuine omission in an otherwise thorough disclosure section.

Everything else in Authored fields is complete and honestly reasoned: `communication: []`, `hearing`/`smell` bands, `genome.chirality: rolled`, `climb`/`leap` bands, `weightKg`, the `body` anatomy key, `charisma` band, and `archetypeWeights.stalwart` are all correctly flagged.

### (c) Is `hide` as a distinct anatomy key and instrument beside `shell` honest for a single-carapace crustacean?

**No — this is the strongest finding in this review.** The species description gives exactly two body-surface facts: "the black-shelled body of a crab" (shell) and "an immovable wall of chitin" (also, explicitly, chitin — the same substance as the shell). A "black-shelled crab body" and a "wall of chitin" describing the identical exoskeleton are being read as two separate anatomical structures (`shell` = the casing, `hide` = "the body surface used defensively") when the source gives no indication of a second, non-shell skin layer. A crab-type crustacean's entire external surface *is* its shell/carapace; there is no described soft hide distinct from the chitin casing. This reads as the anatomy registry's two closest-fitting keys being both claimed from a single physical fact so that the species gets 3 instruments (the template caps instruments at 1-3, and `pincers`+`shell` alone would only be 2) rather than because the source actually describes two different parts. Compounding this, `hide` is then promoted to an *instrument*, i.e., something the creature fights or works with — but the sentence it's sourced from ("becoming an immovable wall of chitin", "root itself to the ground") describes passive obstruction, not an active working part. The skill's own instrument-selection guidance (section 6.5) says to "prefer the parts the description actually uses to fight or work" — the wall-of-chitin sentence describes the whole body becoming immovable, which is arguably better captured by the `body` anatomy key (already present) than by inventing a second casing layer.

### (d) Is `void-sense` supported or authored?

**Authored (a defensible inference), and it should have been disclosed as such.** See (b) above. `void-sense` is a legal registry enum value, and the reasoning offered is not unreasonable (a creature that shapes gravitational fields plausibly senses what it shapes), but no source sentence states any perceptual ability, and the walkthrough's Authored fields section — whose entire stated purpose is to be "the only record of which values are guesses" — omits it.

### (e) Is the temperature band -6 to 34 justified against both the data block and the history?

**Partially.** The planet `data` block gives `Temperature Low: -6 °C`, `Temperature High: 93 °C`. The band's floor (-6) is a clean, defensible match to the planet's literal low, and the walkthrough's reasoning ("standing water on such a world can approach freezing") is sound. The band's ceiling (34) has no quoted justification at all — no sentence in the history or the data block supports 34 specifically over, say, 20 or 50. The walkthrough's stated logic ("the planetary high belongs to geologically hot ground, not to a shaded wetland...emits almost no visible light other than the shortest bands of infrared radiation") explains *why the ceiling should be well below 93*, which is a fair qualitative argument, but 34 itself is an unsourced number dressed in sourced-sounding language. This does not violate the skill's hard rule (section 5.5: "Extending past the planet range...requires a quoted source sentence; without one it is a validation failure") because the band stays *inside* the range, which is all the hard rule requires — but the walkthrough's prose overstates how "justified" the specific ceiling number is. This should have been disclosed as an authored value (like weightKg was) rather than presented as derived.

### (f) Are the WARN answers in the walkthrough real answers?

**Yes, both are real and correct.** Both WARNs (`signature.description.elementkey` and `enc.definition.elementkey`) flag the word "water" appearing as plain English in the signature description and Encyclopedia definition. "Water" is not one of the 14 element keys (the element is `dark`, and there is no `water`-labeled anything being invoked as a type reference here — Poseidas's element is "Water" but that is not being cited). The walkthrough's answer, that "water" is used in its ordinary English sense (describing the wetland's standing water the creature hunts in, sourced directly from "generate miniature black holes in the water"), is correct and sufficiently reasoned. Not a rubber-stamp non-answer.

## Step 5: signature check

- Ledger wording verified independently at `docs/ability-catalog/consolidated-dark.md:52`: `"Point of No Return remains signature-register (Graviclaw's signature; ratified 2026-09-01: pincers / snare / dark)."` This matches the walkthrough's citation exactly.
- Template fields: `name: "Point of No Return"`, `instrument: "pincers"`, `action: "snare"`, `medium: "dark"` — all four match the ledger entry exactly.
- Collision scan: grepped `Point of No Return` (case-insensitive) across every `consolidated-*.md` and `neutral-pools.md`. All hits are either (1) the reservation/ledger note itself, (2) disposition notes in composed-* / rejected-* working files explicitly stating it was excluded/reserved as signature-register and never composed into a cell, or (3) the `xalian-creature-data-structure.md` example record, which is documentation, not a catalog cell. No actual catalog cell (element x action name list) contains the string. **No collision.**
- Intensity band [55, 85]: defensible — high because the walkthrough correctly identifies this as the creature's entire hunting method rather than an incidental power, with headroom below the ceiling for weaker individuals. Reasonable.
- Combat legibility: the description ("It opens a claw beneath the water and collapses the gravitational waves inside it until nothing within reach can swim away from the closing grip") names no mechanics (no HP, no numbers, no game terms) and describes a physical, visualizable act. Passes the no-mechanics-in-prose rule.

## Step 6: canon compliance

- No gendered/lineage language: confirmed absent in all three files (pronoun is "it" throughout).
- No spoken language: confirmed; `communication: []`, no vocal/language reference anywhere.
- No teleportation/invisibility/puppeting/time reversal/life creation/permanent transformation: confirmed absent. The gravitational-pull ability is capture/drawing-in, not teleportation of the creature itself; consistent with the skill's own carve-out that this exact power (bending space to create black holes) is canon-native to Grimedes without violating the teleportation ban, since it is not instant matter-movement of the Graviclaw itself.
- No crypto or mechanics vocabulary: confirmed absent (no "mint", no stats/HP/turns in prose).
- No em-dashes: confirmed in all three files — the only dash-like characters found are markdown table pipes/hyphens, no actual em-dash character (—) appears anywhere in `graviclaw.json`, `graviclaw.md`, or `graviclaw.encyclopedia.json`.

## Step 7: adversarial scan — judgments the sources do not support, descending confidence

1. **`hide` as a second anatomy key/instrument distinct from `shell`.** Both are sourced from descriptions of the same chitin exoskeleton on a single-carapace crab-bodied creature; no source sentence describes two separate surface structures. This is the highest-confidence finding — it inflates both the anatomy list and, more consequentially, the instrument list (which gates what abilities the species can draw), from a single physical fact stretched across two registry keys.
2. **`senses.special: [void-sense]` presented as sourced reasoning rather than disclosed as an authored inference.** No sentence states the creature perceives anything; this should be in Authored fields and is not.
3. **`temperatureC.max: 34`** is an unsourced specific number, dressed in a qualitative argument about infrared light and shaded wetlands that explains a direction (well below 93) but not the specific value 34. Should be disclosed as authored, like `weightKg` was.
4. **`traits.pool.menacing: 2`** is sourced from a sentence about physical immovability against "larger foes", not from any description of intimidation, display, or effect on an opponent's courage/will, which is the registry's actual definition of the trait. Low weight partially mitigates this, but the trait itself is arguably not supported at all rather than weakly supported.
5. **`traits.pool.perceptive: 3`** is an inference stacked on an inference (the hunting method implies the creature must detect prey it cannot see, therefore it is perceptive) rather than any direct statement of detection ability.
6. **`lifespan: long`** partly leans on "Grimedes is a world on the verge of death," a sentence about the star system's orbital/astronomical fate, to argue against `enduring`; this is a strained fit for "home-world harshness" as a day-to-day field-wear factor, though the skill does permit planet-wide sentences for lifespan specifically.
7. **`capabilities.burrow: [50,75]`** reads "lurks just beneath the foggy wetlands" as substrate-digging burrowing rather than the more direct reading of submersion under water/fog cover; a fair inference but not a certain one, and the band is not trivial (50-75 is a meaningfully high burrow competence for a creature never once described touching soil or digging).
8. **`breathes`/`ambientMedia: [gas, liquid]`** stitches "in the water" (about the black-hole generation location) and "beneath the...wetlands" (about the ambush position) into a claim about respiration specifically. The walkthrough itself is the one that surfaces this as its own open question rather than asserting certainty, which is the correct and honest move, but the JSON field itself carries no such hedge, so a reader of the JSON alone would take `[gas, liquid]` as settled fact.

## Verdicts

**Template: PASS.** Validator script returns 0 FAIL, 2 WARN, and both WARNs are honestly answered. Structural constraints (anatomy/instrument consistency, breathes subset of ambientMedia, guaranteed+rolled counts, exclusion pairs, manipulation >40 gated by grasping anatomy, temperature inside planet range) all hold. The `hide` finding (Step 7 #1) is a real over-claim but does not break any hard structural rule the validator checks — it is a judgment-quality issue, not a shape failure. No CONTRADICTED clauses anywhere.

Failing items to fix before this counts as a clean PASS on judgment quality (not script-shape):
- `hide` should not be listed as both a distinct anatomy key and an instrument alongside `shell` on a single-carapace crustacean with no source sentence describing a second surface structure. Either drop `hide` (leaving `pincers`, `shell` as the two honest instruments) or provide a source-grounded distinction between the two.
- `senses.special: [void-sense]` must be added to Authored fields, or a genuine source sentence must be found to support it.
- `temperatureC.max: 34` should be disclosed as an authored value rather than presented as though the specific number were derived from the infrared/shaded-wetland argument.

**Walkthrough: PASS with the disclosure gap above.** The walkthrough is unusually disciplined about the planet-wide-sentence trap (correctly refuses it for `nocturnal`), correctly discloses most authored values, correctly answers both WARNs, correctly cites and matches the reserved-signature ledger, and its 48 spot-checked quotations are all verbatim. Its one real defect is failing its own stated completeness promise for the Authored fields section by omitting `void-sense`, and slightly overstating the sourcing behind the temperature ceiling.

**Encyclopedia: PASS.** All clauses SUPPORTED, no invented facts, correct register, no em-dashes, no mechanics vocabulary.

## Top findings (descending confidence)

1. `hide` anatomy key + instrument is very likely double-counting the single "black-shelled...wall of chitin" chitin exoskeleton as two separate body parts, inflating the instrument list from 2 to 3.
2. `senses.special: [void-sense]` is an undisclosed authored inference; no source sentence describes any perception.
3. `temperatureC.max: 34` is an undisclosed authored number; only the floor (-6) matches a quoted planet figure.
4. `traits.pool.menacing: 2` is sourced from a physical-immovability sentence, not from any statement of intimidation or courage-eroding presence, which is the trait's actual registry definition.
5. `lifespan: long` leans in part on a planet-wide astronomical-doom sentence rather than a species- or field-condition sentence.
