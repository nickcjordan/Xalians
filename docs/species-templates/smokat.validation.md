# Smokat: independent validation

Validator scope: `smokat.json`, `smokat.md`, `smokat.encyclopedia.json`, checked only against the Smokat entry in `species.json`, the Phantiri entry in `planets.json` (full `history` array and `data` block), and `art/smokat.png`, per `migrate-species/SKILL.md` sections 2, 3, 4, 5, 6.

## Step 1: validator script and denial log

Command run: `node docs/species-templates/tools/validate-template.js smokat` from `C:\dev\src\xalians-catalog`.

```
0 FAIL, 0 WARN (structurally clean; every WARN must be answered in the walkthrough)
logged to docs\species-templates\validation-log\smokat.jsonl
```

Full log (`validation-log/smokat.jsonl`), 8 runs:

| Run | Fails | Warns | Notes |
|---|---|---|---|
| 1 | 2x `file.missing` (walkthrough, encyclopedia not yet written) | `traits.expected` 3.99 | Pre-existence-of-files run, not a denial of an idea |
| 2 | `md.emdash`; `md.quote` (unverified quote: planet Terrain field) | `enc.definition.name` | Both are legitimate denials |
| 3 | none | `enc.definition.name` | |
| 4-8 | none | none | Final state clean; run 7 carries orchestrator note "data block added to the quotation corpus" |

Comparison against the walkthrough's Script denials section: **every denial is admitted honestly.** The walkthrough's "None" for FAILs on authored *values* is accurate (the two `file.missing` fails were sequencing, not content, and are correctly excluded from that framing); the `md.emdash` and `md.quote` fails from run 2 are not mentioned by name in the Script denials section, which is a minor omission, but the walkthrough's adjacent "Validator output" section at the bottom does correctly report "Two WARNs were raised... both were answered by revision," covering the `traits.expected` and `enc.definition.name` warns truthfully, including the honest admission that `menacing` "had no source sentence behind it" in the original pool. No denial is minimized or hidden.

## Step 2: art reading, feature by feature

Image: `art/smokat.png`, 1000x950 PNG, a black silhouette of a reared quadruped-built feline with flame/vapor-tongue motifs.

| Walkthrough claim | Art check |
|---|---|
| "single lean feline standing upright on its two hind legs, chest raised and back arched" | Confirmed |
| "both forelimbs lifted clear of the ground and the paws held open, toes spread, in front of the chest" | Confirmed; right forepaw is raised toward the flame mass, left forepaw lower but also clear of ground |
| "head is in profile: pointed tufted ears, a long muzzle drawn open in a snarl over a full row of small sharp teeth, and one narrow slit eye" | Confirmed |
| "long tapering tail sweeps down and away to the left and its tip dissolves into a large roiling curl of vapor drawn as a separate billowing mass" | Confirmed; the tail runs from the hip down and left to a large rounded flame/smoke mass |
| "curling tongues of smoke rise along the entire right side of the animal, off the shoulder, off the raised forepaw, off the flank, off the hind thigh, and off the standing foot" | Confirmed; flame-tongue shapes appear at each named location |
| "hind feet end in three splayed clawed toes" | Confirmed on the standing (rear) foot |
| "outline of the trunk is smooth and unbroken, with no tufting, plume edges, plate seams, or scale seams anywhere on it" | Confirmed; the torso silhouette is a plain smooth curve |
| "It is one body, not many" | Confirmed; single continuous figure |

One caveat worth flagging: the curling shapes are drawn in a heraldic flame-tongue style indistinguishable, as pure silhouette, from stylized smoke or fire. Reading them as vapor/smoke (rather than literal flame) is the only reading consistent with the ghost element and the species description's "atomize into a cloud of smoke," so the walkthrough's interpretation is the correct and only defensible one; it is not an alternate-species mix-up. Verdict: **art paragraph is accurate feature by feature.**

## Step 3: upgraded description, clause by clause

Full text (129 words by direct count, inside the 60-140 word register floor):

> A lean feline that walks upright on its hind legs, with a long tail and a body that trails vapor at every joint, the Smokat was printed by the secret Generator installed in the bowels of Phantiri to work the dig sites the Imperial Houses opened across the world. It is clever, and in normal form it is flesh and claw, but it can instantly atomize into a cloud of smoke, so a collapsing gallery took nothing from it and no overseer could hold it long. The Generator has since gone on churning under the Leviticus Overdrive, and the Smokat now hunts the haze above the Dreadscape, where a body that scatters at will is the difference between competing for a Scrambler Token and joining the mass grave underfoot.

| Clause | Verdict | Basis |
|---|---|---|
| "A lean feline that walks upright on its hind legs" | SUPPORTED | species: "Feline shaped in normal form"; art: bipedal stance |
| "with a long tail and a body that trails vapor at every joint" | SUPPORTED | art: tail, and vapor curls at shoulder/forepaw/flank/thigh/foot |
| "was printed by the secret Generator installed in the bowels of Phantiri" | SUPPORTED | planet h[12]: "the Vallerii had left behind a secret Xalian Generator in the bowels of Phantiri" |
| "to work the dig sites the Imperial Houses opened across the world" | INFERRED | planet h[7]: "The Imperial Houses demanded answers, going so far as to install a top secret Xalian Generator on the world. They would need Xalian laborers after all"; "dig sites" is directly named in h[6]/h[8]; "across the world" is a light but fair generalization from "Ever more dig sites continued to uncover" |
| "It is clever" | SUPPORTED | species: "this clever creature" |
| "in normal form it is flesh and claw" | SUPPORTED | species: "Feline shaped in normal form"; art: claws on hind feet |
| "it can instantly atomize into a cloud of smoke" | SUPPORTED | species: verbatim |
| "so a collapsing gallery took nothing from it" | INFERRED | fair connective from the atomize clause plus the dig-site setting the prior clause establishes; no source sentence names a collapsing gallery specifically, but this is exactly the kind of extrapolation the "upgrade must not add facts... only expand what they say" rule permits given the established dig-site context |
| "no overseer could hold it long" | INFERRED | species: "quick evasion" read against the established laborer role; reasonable |
| "The Generator has since gone on churning under the Leviticus Overdrive" | SUPPORTED (phrase) but see flag below | planet h[13]: "the Phantiri Generator has re-written its own code in what has been coined the Leviticus Overdrive" |
| "and the Smokat now hunts the haze above the Dreadscape" | SUPPORTED | planet h[12]: "vast wasteland known as the Dreadscape"; data block: "Thick Haze" |
| "where a body that scatters at will is the difference between competing for a Scrambler Token and joining the mass grave underfoot" | INFERRED | planet h[14]: "its grotesque denizens must now compete for the Scrambler Tokens necessary to resurrect themselves"; h[12]: "planetwide mass grave" |

**Flag (not in the walkthrough's open questions):** the sentence "The Generator has since gone on churning under the Leviticus Overdrive, and the Smokat now hunts..." reads as continuity: the Generator that made Smokat is still running, now under the Leviticus Overdrive regime, and Smokat persists into that present. But planet h[13] is explicit about what the Leviticus Overdrive *produces*: "a wholly unrecognizable form of 'life' — ghost-like Xalians formed of spectral energy, with **no corporeal bodies to speak of**." Smokat, by contrast, is templated as `corporeal`/`flesh` with a resting body of "flesh and claw." The clause does not literally claim Smokat was printed *by* the Overdrive-era process (the description's chronology, read carefully, has Smokat printed earlier, before the timeline turn to "has since gone on churning"), so it is defensible as **INFERRED, not CONTRADICTED** — but it sits close to the line, since a casual read implies present-day Smokats are current Generator output, which the planet history reserves for the non-corporeal phantom Xalians. This is a real interpretive risk the walkthrough's own open question (about `phasing` percentage) gestures at but does not name directly. Recommend tightening in a revision pass, not a blocking failure as written.

## Step 4: signature description and encyclopedia definition

**Signature description:** "It comes apart into smoke mid-stride, crosses the ground as haze, and is whole again with its claws already closing." — SUPPORTED by species: "can instantly atomize into a cloud of smoke for a sneak attack." Reverts (no permanent transformation), no mechanics, no em-dash, canon voice. PASS.

**Encyclopedia definition**, clause by clause:

| Clause | Verdict | Basis |
|---|---|---|
| "a clever upright feline generated on Phantiri to work the dig sites the Imperial Houses opened there" | INFERRED | same chain as description clause above |
| "able to come apart into a cloud of vapor at will and reassemble elsewhere" | INFERRED | species names atomizing; "reassemble" and "elsewhere" are not stated but are a fair reading of a body that atomizes for evasion/attack and must return to solid form to strike or escape |
| "It now hunts the haze above the Dreadscape" | SUPPORTED | planet, as above |
| "where nothing holds it long enough to kill it" | **OVER-CLAIMED** | neither source frames the stakes as lethal capture; the closest source language is species "quick evasion" and the description's own (already-inferred) "no overseer could hold it long," which is about labor control, not survival-from-death. "Long enough to kill it" imports a stakes framing (deadly threat) that is not in either source and reads as embellishment beyond what the upgrade rule allows |

## Step 5: field-by-field physiology audit

| Field | Value | Verdict | Basis |
|---|---|---|---|
| corporeality | `corporeal` | HONEST | species gives a resting physical body; smoke is a transient ability state per 5.5's explicit rule |
| composition.primary | `flesh` | HONEST | matches registry's own worked example verbatim ("a body that can become smoke is `flesh` alone") |
| bodyPlan | `biped` | HONEST | art forelimb test applied correctly: forepaws clear of ground, open, held in front of chest — matches the registry's own biped test language almost exactly |
| anatomy: claws, jaws, tail | HONEST | all directly visible in art |
| anatomy: `hide` | HONEST | `hide` (anatomy) is explicitly defined to include "bare" surfaces and to assert "no armored aspect" — this is the correct minimal honest key for a `bare`-covering body with no armor, and the walkthrough self-flags it in Authored fields as required |
| covering | `bare` | HONEST | neither source names a surface; art outline is smooth with no tufting/plume/plate/scale edges, which is exactly the fallback condition in the registry |
| instruments | `claws`, `jaws` | HONEST but see flag | both physical, both in anatomy, chosen per the "pilot lesson" (instrument is where effect terminates). Flag: two pre-migration harvest documents in `docs/ability-catalog/` (`anatomy-consolidated.md`, `anatomy-demand-sweep.md`) explicitly recommend `body` as Smokat's instrument, stating "No discrete physical part; whole-body smoke transformation only" and "the whole-body atomization is a body-level instrument, not a discrete part." These documents predate the ratified art-as-source rule (v2.6), and the walkthrough's use of the art to source `claws`/`jaws` is procedurally allowed under the current skill, so this is not a violation — but it is a substantive prior-analysis conflict worth surfacing, since it changes the signature instrument choice materially |
| diet | `carnivore` | **UNSUPPORTED** | Registry 5.5 `diet` selection rule is explicit: a sentence showing only fighting/attack ("sneak attack") is NOT evidence of feeding, and when the sources say nothing about feeding, a `flesh` body defaults to `omnivore`, not `carnivore`. The walkthrough correctly identifies that "sneak attack" is not a feeding sentence, then incorrectly substitutes anatomy (claws, teeth) for the registry's actual default rule instead of applying it. The template should read `diet: omnivore`. This is self-flagged as authored, which is honest, but the assigned value itself contradicts the ratified default |
| communication | `["vocal"]` | HONEST | art shows the snarling open mouth as outward signaling (a hiss/snarl sound), correctly distinguished from mere anatomy |
| breathes / ambientMedia | `["gas"]` / `["gas"]` | HONEST | planet data block "Thick Haze" plus a flesh body on a fogged world |
| temperatureC | `[-30, 45]` | HONEST | inside planet range [-58, 53]; narrower sub-band justified by bare-skin reasoning |
| senses | sight/hearing/smell bands | HONEST | reasoned from art features (eye, ears, muzzle), correctly kept modest and self-flagged as authored |
| lifespan | `standard` | HONEST | mass midpoint 71 kg falls in the 20-200 kg standard cut; no armored covering or cold/slow/long-lived language triggers the +1 adjustment; no harshness sentence triggers cut 4. Math checks out |
| size | 150-185 cm / 58-84 kg | HONEST | legacy gauge (170 cm / 77 kg) sits inside both bands, correctly used as a relative check only |
| archetypes | prowler 5, predator 4, skirmisher 3, seeker 2, rogue 1 | HONEST | all traceable to sourced adjectives/art ("clever," "sneak attack," "quick evasion," predator head) |
| capabilities: manipulation | `[30, 55]` | **OVER-CLAIMED** | registry rule: manipulation upper bound above 40 requires grasping anatomy or `telekinetic` at 100. `claws` is defined in the registry (5.6) as "hooking or raking digits," filed under "Limbs," not under the separate "Reach and grasp" category (`tendrils`, `roots`, `pseudopods`) that the registry uses for grasping. Nothing in the registry calls `claws` grasping anatomy. The walkthrough's own text hedges this exact point ("if the orchestrator reads `claws` as non-grasping, drop the upper bound to 40") but ships 55 anyway rather than resolving it against the plain registry text. Upper bound should be 40, not 55 |
| capabilities: swim/burrow/climb/leap/sprint | HONEST | reasonably argued from feline build and "quick evasion," correctly flagged as authored where not directly sourced |

**Does the Authored fields section list every unsourced value?** Mostly yes — it lists covering, `hide` anatomy, diet, size, capabilities, senses, attributes, archetypeWeights, lifespan, temperatureC sub-band, intensity, and communication. It does not separately call out that the `diet` *value* itself (not just its authored status) conflicts with the ratified default, nor does it flag the manipulation upper-bound tension as unresolved rather than settled (it hedges instead of resolving). Otherwise the section is thorough and honest.

## Step 6: signature ability audit

- **Collision scan:** re-run independently: `grep -ni "scattering pounce"` across all 14 `consolidated-*.md` files and `neutral-pools.md` returns **zero matches**. The walkthrough's claim of "0 hits" is confirmed accurate. (A loose substring match on the bare word "scattering" appears once in `consolidated-light.md` and once in `neutral-pools.md`, unrelated to this name — no collision.)
- **Registry vocabulary:** "Scattering Pounce" has no possessive, no hyphen, no Earth-fauna/franchise reference. PASS.
- **Action `ambush`** against its ratified definition ("a burst of closing speed that ends in a hit"): the signature description ("comes apart into smoke mid-stride, crosses the ground as haze, and is whole again with its claws already closing") matches this definition closely — closing speed via the smoke crossing, ending in a claw hit. PASS. `ambush` is confirmed in the allowed-actions table for `claws`.
- **Medium `ghost`:** primary element, correctly needs no rolled affinity. PASS.
- **Combat-legible without mechanics:** confirmed, no HP/damage/turn language anywhere in the description.

## Step 7: canon compliance

Scanned all three files for: gendered/lineage language, spoken language, teleportation, invisibility, puppeting, time reversal, life creation, permanent transformation, crypto/mechanics vocabulary, em-dashes.

- **Gendered/lineage:** no hits (grep for he/she/his/her/mother/father/etc. returns nothing).
- **Em-dashes:** no hits in the current template, walkthrough, or encyclopedia files (the historical em-dash was caught and fixed in run 2, per the log).
- **Teleportation/invisibility:** the atomizing-into-smoke mechanic is consistently described as a transient physical state ("comes apart into smoke," "crosses the ground as haze," "is whole again") — never called teleportation (it "crosses the ground," implying travel through space, not instant relocation) and never called invisibility (smoke is still a visible, detectable form, distinct from true invisibility). This is a correct, careful choice of verbs throughout all three files. PASS.
- **Puppeting/time reversal/life creation:** no such language present. PASS.
- **Crypto/mint vocabulary:** "Scrambler Token" is used correctly per the generate/generated/origin register (never "mint"). PASS.
- **Nuclear-age military register:** none present.

## Step 8: adversarial scan, descending confidence

1. **`diet: carnivore` contradicts the registry's own default rule (85% confidence this is a real defect).** The walkthrough correctly reasons that "sneak attack" is not a feeding sentence, then does not apply the registry's mandated fallback (`omnivore` for a flesh body with no feeding sentence), substituting an anatomy-based inference the registry does not authorize for this field. This is the clearest UNSUPPORTED finding in the audit.
2. **`manipulation: [30, 55]` upper bound exceeds the 40 ceiling without qualifying grasping anatomy (70% confidence).** `claws` is registry-defined as hooking/raking digits, a "Limbs" key, not a "Reach and grasp" key. The walkthrough hedges rather than resolves this, and ships the higher value.
3. **The Leviticus Overdrive continuity clause sits close to contradicting the non-corporeal nature of Overdrive-era Generator output (40% confidence this rises to a real problem; more likely a defensible but risky INFERRED reading).** Worth a tightening pass or an explicit open question to Nick, since the walkthrough's actual open question is adjacent (about `phasing` percentage) but does not name this specific tension.
4. **Encyclopedia clause "where nothing holds it long enough to kill it" imports unsourced lethal stakes (35% confidence this is a meaningful over-claim vs. harmless flavor).** Neither source frames Smokat's evasion as a matter of survival from death; the closest source language is about labor control/capture, not killing.
5. **Instrument choice (`claws`/`jaws` vs. `body`) conflicts with two pre-migration harvest documents' explicit recommendation, though this is very likely a legitimate, procedurally sanctioned divergence given the later art-as-source ruling (15% confidence this should actually change; mainly a documentation/cross-reference note for the orchestrator).**
6. **Everything else audited (art reading, upgraded-description core clauses, signature ability, collision scan, corporeality/composition/bodyPlan/covering/`hide` anatomy honesty, temperature, lifespan, size, canon compliance, em-dash and gendered-language scans) checks out clean.**

## Verdicts

| Artifact | Verdict | Failing items |
|---|---|---|
| Template (`smokat.json`) | **FAIL** | `physiology.diet` should be `omnivore` per the ratified default rule for a flesh body with no feeding sentence, not `carnivore`; `capabilities.manipulation` upper bound of 55 exceeds the registry's 40 ceiling for non-grasping anatomy (`claws` is not defined as grasping) |
| Walkthrough (`smokat.md`) | **FAIL** | Same two items originate here (the diet reasoning misapplies the selection rule; the manipulation reasoning self-identifies the conflict but does not resolve it in favor of the registry text); additionally does not name the Leviticus Overdrive corporeal/non-corporeal tension as an open question, though its adjacent phasing-percentage question is in the same neighborhood |
| Encyclopedia (`smokat.encyclopedia.json`) | **FAIL** | "where nothing holds it long enough to kill it" is OVER-CLAIMED, introducing lethal-stakes framing not present in either source |

None of these are canon violations, collision failures, or structural/script failures — the validator script itself correctly reports 0 FAIL, 0 WARN, because none of these three issues are things the script is built to check (registry-default misapplication and embellishment-detection require the independent validator's judgment, which is exactly what this pass is for). All three are fixable with small, targeted edits: change `diet` to `omnivore` (or provide an explicit lore justification for departing from the default, which none currently exists), cap `manipulation` at `[30, 40]`, and trim the encyclopedia's closing clause to something the sources actually support (e.g., echoing "no overseer could hold it long" instead of introducing lethal stakes).
