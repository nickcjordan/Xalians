# Tetrahive migration: independent validation report

Sources read in full: the Tetrahive entry in `lambda/src/json/species.json` (Xalians repo) and the entire Grimedes entry (`history` array plus `data` block) in `lambda/src/json/planets.json`. Registry read from `.claude/skills/migrate-species/SKILL.md` sections 2 through 6 only. Collision check performed independently against all 14 `consolidated-*.md` files and `neutral-pools.md`. No other template, no `RULINGS.md`, no `docs/design/`, no `CLAUDE.md`, no memory file, and no prior `*.validation.md` was read.

## Step 1: validator script output (verbatim)

```
0 FAIL, 0 WARN (structurally clean; every WARN must be answered in the walkthrough)
logged to docs\species-templates\validation-log\tetrahive.jsonl
```

Cross-checked against `docs/species-templates/validation-log/tetrahive.jsonl`: three logged runs. Run 1 recorded `fails: [{"code":"md.emdash","msg":"walkthrough contains an em-dash"}]` and `warns: [{"code":"enc.definition.name","msg":"definition does not name the species"}]`. Runs 2 and 3 both record `fails: []`, `warns: []`. This matches the walkthrough's own Script denials section exactly (one FAIL fixed by replacing an em-dash with a colon in the Authored fields list, one WARN answered by rewriting the encyclopedia opening to name the species). No discrepancy between the log and the walkthrough's account of it.

## Step 2: upgraded description, clause by clause

Full text: "A single creature distributed across a cloud of small flying bodies, each one little more than a set of teeth, all of them held together and directed by one mind. The Generator on Grimedes was funded to produce test subjects rather than a labor force, and a body that could be divided, counted, and reassembled was ideal for measuring what the black hole was doing to living matter. What the observatories bred instead was a predator that never presents a target. In the present day the Tetrahive scatters over the stalky undergrowth of the flats, thins to nothing when struck, and closes again as one unit on whatever it has decided is prey, which is the sort of watchman the rim keeps now." (123 words.)

| Clause | Verdict | Basis |
|---|---|---|
| "a single creature distributed across a cloud of small flying bodies" | SUPPORTED | species: "a swarm of small flying familiars" |
| "each one little more than a set of teeth" | SUPPORTED | species: "with teeth like piranhas"; compression, no new fact |
| "all of them held together and directed by one mind" | SUPPORTED | species: "It controls the swarm with its mind" |
| "a body that could be divided, counted, and reassembled" | INFERRED | connective gloss on the swarm body plan; no new fact, but "counted" is authorial color with no textual anchor |
| "the Generator on Grimedes was funded to produce test subjects rather than a labor force" | SUPPORTED | planet: "the Xalians on Grimedes were not intended to serve as a labor force, but as a population of test subjects for experimentation"; "funded" folds in the separate ECHELON-funding sentence, a reasonable compression |
| "measuring what the black hole was doing to living matter" | SUPPORTED (paraphrase) | planet: "insisted on studying its effects on the Xalian population, leading to all manner of horrific experiments" ("its" = the black hole's) |
| "the observatories bred" | **INVENTED** | The planet text says the Generator (funded via ECHELON black-site R&D) produced the Xalians; observatories and astrophysics laboratories are described as separate facilities built for a different purpose (studying the black hole and distant galaxies), never as breeding sites. Crediting "the observatories" with breeding substitutes one actor for another. |
| "a predator that never presents a target" | **INVENTED / unsupported tactical claim** | Neither source states or implies this specific combat property. It reads as a natural extrapolation of "attacking or defending as one unit" but asserts a new fact (untargetability) that is not in either source. |
| "the stalky undergrowth of the flats" | SUPPORTED | planet: "thick, stalky undergrowth" and terrain data "Flat Land, Thick Stalky Undergrowth" |
| "thins to nothing when struck" | **INVENTED** | No sentence in either source describes the swarm's response to being struck. This is new combat-relevant behavior with no textual basis; the walkthrough's own evidence table maps this clause only to "attacking or defending as one unit," which describes coordinated offense/defense, not dispersal under damage. The walkthrough does not actually defend this clause on its merits — it just cites an unrelated source sentence next to it. |
| "closes again as one unit on whatever it has decided is prey" | SUPPORTED / INFERRED | species: "attacking... as one unit"; "decided is prey" is a fair gloss on `carnivore` + "teeth like piranhas" |
| "which is the sort of watchman the rim keeps now" | SUPPORTED (paraphrase) | planet: "the Grimedites stand at the edge of the galaxy, trusted or perhaps condemned to watch the endless black and guard against APEX's inevitable return" |

**Net finding:** two clauses are invented facts, not fair connectives: "the observatories bred" (misattributes creation from the Generator to the observatories) and "thins to nothing when struck" (a specific damage-response behavior with zero textual support). A third clause, "never presents a target," is unsupported tactical color stated as established fact rather than flagged as inference. The walkthrough's own clause table does not surface any of these three as authored/inferred; it presents all ten rows as sourced, which overstates the description's grounding.

**On "summons a swarm" becoming "the creature IS the swarm":** this is a substantive reframing of what kind of entity a Tetrahive is, not merely a cosmetic dodge of the no-summoning rule. The legacy stub reads naturally as a single controller entity that calls forth a separate swarm of familiars and commands it ("It controls the swarm with its mind"), which implies a controller/subject duality. The template collapses that duality: `bodyPlan: swarm` makes the many bodies the creature itself, with no separate controller. This is explicitly sanctioned by section 2 ("a swarm's units are extensions of one body") and is the correct resolution available under the registry, but it is not a change of framing alone; it changes the reading of "controls... with its mind" from an external command relationship to internal self-coordination. This should be called a **necessary and licensed reinterpretation of canon**, not "a rewrite of framing, not of fact" as the walkthrough states — the walkthrough's own characterization slightly understates what it did.

**Voice rules (section 3):** word count 123 (60-140 range: pass), single paragraph, present tense, appositive opening ("A single creature distributed across..."), engineered purpose stated (test-subject funding), present-day turn anchored to a named location ("the flats," "the rim"), no game mechanics vocabulary, no em-dash (confirmed programmatically), American English. Formally compliant.

## Step 3: signature and encyclopedia clause audit

**Signature description**: "The scattered bodies fall in from every side at once and strip the target as a single closing mouth." SUPPORTED — direct paraphrase of "with teeth like piranhas" plus "attacking or defending as one unit." No mechanics, no em-dash. Passes.

**Encyclopedia definition**: "The Tetrahive is a predator of Grimedes whose body is a cloud of small flying units, each carrying a set of teeth, held together and directed by one mind. It attacks and defends as a single unit, closing on a target from every side and thinning apart again when struck."

| Clause | Verdict |
|---|---|
| "predator of Grimedes" | SUPPORTED (species type/planet + carnivore dentition) |
| "cloud of small flying units, each carrying a set of teeth, held together and directed by one mind" | SUPPORTED, mirrors sourced description clauses |
| "attacks and defends as a single unit" | SUPPORTED |
| "closing on a target from every side" | INFERRED, defensible paraphrase of "as one unit" |
| "thinning apart again when struck" | **INVENTED (inherited)** | Same unsupported damage-response claim as the description, propagated into the encyclopedia entry. |

Encyclopedia register (leads with category noun, no element key named, no flourish): compliant in form, but it inherits the one invented factual claim from the description.

## Step 4: physiology field-by-field audit

| Field | Value | Verdict |
|---|---|---|
| `corporeality` | corporeal | HONEST |
| `composition.primary` | flesh | HONEST |
| `bodyPlan` | swarm | HONEST, and does the canon-compliance work (see Step 2) |
| `anatomy: jaws` | — | HONEST, "teeth like piranhas" |
| `anatomy: wings` | — | OVER-CLAIMED but disclosed. Flight is stated ("small flying familiars"); the means is not named. Correctly flagged in Authored fields and raised as an explicit Open Question for Nick rather than silently asserted. |
| `anatomy: body` | — | Acceptable, registry's own "universal fallback" for whole-body-as-instrument action |
| `covering` | bare | HONEST (authored, disclosed) |
| `size.heightCm` | [55,95] | HONEST, anchored to legacy 76cm per rule 5.5 |
| `size.weightKg` | [7,16] | HONEST (authored, disclosed); legacy 12kg correctly used only as a relative gauge |
| `lifespan` | short | HONEST (authored, disclosed), wear rubric correctly applied |
| `genome.chirality` | rolled | HONEST, default |
| `diet` | carnivore | HONEST, "teeth like piranhas" |
| `communication` | [] | HONEST, correctly empty per the v2.2 no-source-no-invention rule |
| `breathes` | [gas] | HONEST, planet atmosphere + flight requirement |
| `ambientMedia` | [gas] | HONEST |
| `temperatureC` | {-6, 34} | HONEST, environment field permitted to draw on planet-wide "perpetual night" sentence; band sits inside the planet's -6 to 93 range as required |
| `capabilities.flight` | [55,80] | HONEST, "small flying familiars" |
| `capabilities.swim/burrow/climb/sprint/leap` | low bands | HONEST (authored, disclosed) |
| `capabilities.manipulation` | [10,25] | HONEST, correctly ≤40 with no grasping anatomy/telekinetic |
| `senses.sight` | [30,55] | HONEST, environment field permitted to use planet-wide "perpetual night" sentence |
| `senses.hearing/smell` | mid bands | HONEST (authored, disclosed) |
| `senses.special` | omitted | HONEST, correctly omitted, no source |

**Authored fields section audit:** every genuinely unsourced value in the JSON is listed in the walkthrough's Authored fields section (`anatomy: wings`, `anatomy: body`, `covering`, `size.weightKg`, `lifespan`, `genome.chirality`, all five secondary capabilities, `senses.hearing`/`senses.smell`, all ten `attributes` bands' magnitudes, all four `archetypeWeights` numeric weights, all four `traits.pool` numeric weights, `signatureAbility.intensity`, `lore.biomeNiche`) — this list is complete and honest against my own independent field pass; I found no unsourced JSON value omitted from it. One gap: the two invented description clauses identified in Step 2 ("the observatories bred," "thins to nothing when struck") are **not** listed in Authored fields as invented facts — the walkthrough only flags two "connective judgments" (divisible-body-convenient-for-experimentation, swarm-decides-what-is-prey) and treats the rest of the clause table as fully sourced. This is the validation report's main finding.

**No trait weight rests on a planet-wide sentence:** confirmed correct. The walkthrough explicitly declines `nocturnal` and `perceptive` on the grounds that their only support would be the planet-wide "perpetual night" sentence, which the registry forbids for trait weights (rule in section 6, step 14). This is the process working correctly and is good evidence of rigor elsewhere in the migration.

**Script denials section vs. validation log:** honest and complete. The walkthrough records exactly the one FAIL (`md.emdash`) and one WARN (`enc.definition.name`) that appear in the log's first entry, and correctly reports both as resolved with no rule disputed. No discrepancy found.

## Step 5: signature audit

- Collision check: independently grepped all 14 `consolidated-*.md` files and `neutral-pools.md` for "tetrahive" and "convocation of teeth" (case-insensitive) and for "convocation" alone. Zero hits in all three searches. No collision, no reservation.
- Instrument `swarm`: correctly NOT `mind`, per the pilot-lesson rule that the instrument is where the effect terminates on the target. The walkthrough's rejection of `mind` is a correct, non-trivial application of that rule (the stub's "controls the swarm with its mind" describes the physics, not the landing point).
- Action `rake`: in the allowed-actions set for `swarm` (`cloud, strike, drain, snare, rake, terrorize`) per section 5.7. Confirmed.
- Medium `dark`: primary element, automatic cover.
- Intensity `[40,80]`: authored, disclosed.
- Name `Convocation of Teeth`: ASCII, no possessive, no hyphen, grander register than catalog names, ≥2 content words plus preposition, exempt from the 2-word limit per rule 5.8(6). Passes.
- Description: combat-legible, no mechanics vocabulary. Passes.

## Step 6: canon compliance scan (all three files)

Programmatic scan for em-dashes, "mint" (crypto vocabulary), and gendered pronouns (he/she/his/her/him) across `tetrahive.json`, `tetrahive.md`, and `tetrahive.encyclopedia.json`: zero hits in every file for every pattern. Manual read of all three files found no spoken-language claim (`communication: []` is correct), no teleportation, no true invisibility, no puppeting/possession, no time reversal, and no permanent transformation. The "summons" framing is correctly resolved into a swarm body plan rather than left as literal life-creation (see Step 2 discussion of what this reframing costs). No nuclear-age military register detected.

## Step 7: adversarial scan, descending confidence

1. **(High confidence, ~85%) "Thins to nothing when struck" is an invented combat-behavior fact**, present in both the species template's lore description and the encyclopedia definition, with no supporting sentence in either source. The walkthrough's clause table pairs it with "attacking or defending as one unit," which is about coordinated offense/defense, not damage response — a citation that does not actually support the claim it is attached to. This should have been listed as an authored/inferred clause, not presented as sourced.
2. **(High confidence, ~80%) "The observatories bred" misattributes an action.** The planet history is specific that the Generator (ECHELON-funded, deployed on Grimedes) did the creating; observatories and astrophysics laboratories are introduced in the prior sentence for a different purpose (studying the black hole and distant galaxies). Folding "bred" onto "the observatories" swaps the actor.
3. **(Medium confidence, ~55%) "Never presents a target" is unsupported tactical color asserted as fact**, not flagged as inference anywhere in the walkthrough. It is a plausible extrapolation but not something either source states.
4. **(Medium confidence, ~45%) The swarm-body reframing is characterized too lightly.** The walkthrough calls it "a rewrite of framing, not of fact." Given the stub's controller/swarm phrasing, this is closer to a licensed reinterpretation of what the creature fundamentally is (one distributed body vs. a controller commanding servants) than a framing-only change. The move is correct and registry-sanctioned, but the walkthrough's self-description undersells how much interpretive weight it carries.
5. **(Lower confidence, ~25%) `anatomy: wings` is the least-grounded structural claim in the JSON**, but this is already transparently disclosed and raised as an open question to Nick, which is the correct process; flagging it here only to note it is the weakest anatomy key, not a hidden problem.
6. **(Low confidence, ~15%) The ghost/rake thin-combo finding was independently verified and is accurate** — grepped `consolidated-ghost.md` and confirmed the rake cell has exactly 111 names, every one tagged `[claws]`, `[aura]`, or `[tendrils]`, none matching `jaws` or `swarm`. This is not a finding against the migration; it is confirmation the walkthrough's catalog-gap claim is correct.

## Verdicts

**Template (`tetrahive.json`): PASS.** All structural constraints hold (verified independently: exclusion pairs, guaranteed/rolledCount arithmetic, manipulation cap, breathes-subset-of-ambientMedia, temperature within planet range, signature action legal for its instrument, signature medium on-graph, no shell/hide co-occurrence). No invented facts live in the JSON itself; the invented material is confined to prose fields.

**Walkthrough (`tetrahive.md`): FAIL.** Failing items: (1) the upgraded-description clause table presents "the observatories bred" and "thins to nothing when struck" as sourced when they are invented facts not supported by either allowed source; (2) "never presents a target" is stated without being flagged as inference; (3) the Authored fields section, which is supposed to be the complete record of every unsourced claim, omits these three prose facts even though it is otherwise a complete and accurate list for every JSON field. The script-denial and validator-output sections are honest and verified accurate against the log.

**Encyclopedia (`tetrahive.encyclopedia.json`): FAIL.** Failing item: it inherits the unsupported "thinning apart again when struck" claim from the description. Register form (category-noun lead, no element key, no flourish) is otherwise compliant, and the WARN-driven rewrite naming the species is a genuine improvement over the first draft.
