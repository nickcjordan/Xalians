# Hypnopet independent validation

Validator scope: `hypnopet.json`, `hypnopet.md`, `hypnopet.encyclopedia.json` against ONLY the Hypnopet entry in `species.json`, the Telypso entry in `planets.json` (history array and data block), and `art/hypnopet.png`, plus the migrate-species skill sections 2, 3, 4, 5, 6.

## Step 1: script output and denial-log comparison

Rerun verbatim:

```
WARN traits.expected                expected trait count 5.30 is above 3.5; confirm the species is meant to carry that many
WARN signature.action.matrix        signature action "snare" is outside the allowed set for crest [beam, burst, terrorize, ward] (allowed by rule 4; justify)

0 FAIL, 2 WARN (structurally clean; every WARN must be answered in the walkthrough)
```

`validation-log/hypnopet.jsonl` holds six run records. The first run (17:53:40) raised three items: `traits.expected`, `signature.action.matrix`, and a FAIL-adjacent... no, check again: the first run's `fails` array is non-empty: `[{"code":"md.emdash","msg":"walkthrough contains an em-dash"}]`, and its `warns` array carries a THIRD warning not present in later runs: `{"code":"enc.definition.name","msg":"definition does not name the species"}`. The second run (17:53:49) shows `fails: []` and the same three warns including `enc.definition.name`. The third run onward (17:54:08 and later) drops `enc.definition.name` from the warns list entirely.

Comparison against the walkthrough's Script denials section: the walkthrough documents exactly one FAIL (`md.emdash`) and treats it fully. It also has a "Validator warnings answered" section that answers `traits.expected`, `signature.action.matrix`, and `enc.definition.name`, stating "fixed. The Encyclopedia definition now names the species in its first clause." This is accurate and consistent with the log: run 1 fails on em-dash and warns on all three; run 2 fixes the em-dash (FAIL clears) but the encyclopedia fix had not yet landed, so `enc.definition.name` still warns; run 3 onward the encyclopedia file was corrected and the warning stops appearing. The current `hypnopet.encyclopedia.json` definition does open "The Hypnopet is..." which names the species. This is internally consistent. No discrepancy found between the log and the walkthrough's account once the intermediate run is read as the transitional state.

## Step 2: art check and the body-plan ruling

Feature-by-feature check of the walkthrough's art paragraph against the PNG:

| Claim in walkthrough | Art check |
|---|---|
| "seated upright on its haunches" | MATCH |
| "shaggy, heavily tufted body with a rounded head" | MATCH, ragged tuft silhouette throughout |
| "two very long lop ears... fall well past the body" | MATCH |
| "single ribbed spiral horn rising from the crown" | MATCH |
| "two enormous round eyes with bright catchlights, a small muzzle, and an open mouth" | MATCH |
| "forelimbs are short and end in small paws held clear of the ground against the chest and belly" | **CONTRADICTED.** See below. |
| "hind limbs are large, splayed forward, drawn with visible pads on the soles and heels" | MATCH |
| "no wings, no tail, no visible plating, shell, spines, or armored aspect" | MATCH |
| "One body, one head, one horn" | MATCH |

The forelimb claim is the load-bearing one for the entire body-plan ruling, and it is wrong. Zoomed crops of the lower body (see the two crops taken during this review) show a lighter belly-fur triangle descending from the chest and terminating at the very bottom of the frame in two small rounded paw shapes that sit on the ground line, positioned between and slightly forward of the two large hind feet. They are not drawn tucked against the chest or held up in the air; they reach all the way down and their toes rest at the same baseline as the hind feet's heels. This is a seated animal with all four limbs reaching the ground, not a creature holding its forelimbs off the ground.

**Applying the section 5.5 bodyPlan selection rule myself:** the description names no leg count, so the rule hands the decision to the art, and the operative test is "whether the forelimbs bear weight... a creature whose forelimbs in the art are free of the ground and end in hands, fists, claws held up, tools, or wings is biped, and one whose forelimbs reach the ground as legs is quadruped, whatever pose it is drawn in." The art shows the forepaws reaching the ground. Under the rule exactly as written, applied to what the art actually shows (not what the walkthrough describes), the correct answer is **quadruped**, not biped. The walkthrough's own open question flags this as a judgment call and recommends Nick rule `quadruped` — but that recommendation is built on a hedge ("I have written biped because... I think the rule was drafted with standing postures in mind") when in fact the rule does not need reinterpreting at all: the walkthrough's premise that the forepaws are "entirely clear of the ground" is simply false. This is not an edge case needing a new sentence in the registry; it is a misread of the source image that, corrected, resolves cleanly to `quadruped` under the existing rule text.

This error cascades: `bodyPlan: "biped"` in `hypnopet.json` is wrong and should be `quadruped`.

## Step 3: description verbatim check, sign-off test, hypnosis cap

**Verbatim check.** `lore.description` in `hypnopet.json` was diffed character-for-character against the `description` field of the Hypnopet entry in `species.json` (id `00028`). They are identical. `descriptionStatus: "source"` is correct.

**Description clause-by-clause:**

| Clause | Status |
|---|---|
| "Hypnopets resemble glowing, golden-furred bunny rabbits with a single color-changing unicorn horn atop their heads." | SUPPORTED, verbatim species.json |
| "They were created by the Telypso Generator as service animals and therapists for the insane Vallerii imprisoned on the world" | SUPPORTED, verbatim; consistent with planet history: "the Generator began to treat the prisoners as patients" |
| "where their natural empathic healing abilities served to balance and treat patients." | SUPPORTED, verbatim |
| "When their horn begins to pulse and swirl with psychedelic color, it hypnotizes others and locks them in a trance" | SUPPORTED, verbatim |
| "which was useful for sedating patients when they entered into dangerous bouts of mania." | SUPPORTED, verbatim |
| "With the Nemesis Plague reducing the patient population of Telypso, many Hypnopets have taken to the stars as healers" | SUPPORTED, verbatim; plague context matches planet history's closing paragraph |
| "though some have been forced into service by King Kozrak, who uses their hypnotic abilities as crowd control on rebellious worlds." | SUPPORTED, verbatim |

Sign-off test on the last sentence: this is source text, not agent-authored prose, so section 3's ban on a dramatic sign-off does not technically bind it (that rule governs prose the agent writes). Read on its own terms, it is a plain present-tense fact about current employment ("used... as crowd control"), not a staged flourish, so it would pass the test either way.

**Signature description**, `hypnopet.json` `signatureAbility.description`: "Its horn pulses and swirls through shifting color until whatever watches it stops moving and stands quiet in the trance." Clause check: "horn pulses and swirls through shifting color" is SUPPORTED (near-verbatim of "pulse and swirl with psychedelic color"). "until whatever watches it stops moving and stands quiet in the trance" is SUPPORTED as a restatement of "hypnotizes others and locks them in a trance." Sign-off test: this is a single plain-present-tense clause describing the mechanism, ending on the fact of the trance itself, not a staged scene or invented consequence. PASS.

**Encyclopedia definition**, two sentences. Clause check:
- "The Hypnopet is a small, golden-furred creature of Telypso bearing a single color-changing horn" — SUPPORTED (small: consistent with legacy height 35cm/14in and weight; golden-furred, color-changing horn: verbatim-adjacent).
- "generated by the Telypso Generator as a service animal and therapist for the deranged Vallerii imprisoned on that world" — SUPPORTED, matches species text and "insane" (deranged is a fair synonym, and planet history independently uses "deranged Vallerii" language: "the most insane and demented of the Vallerii race").
- "Its horn pulses through shifting color to lock a subject in a trance, a sedative once used on patients in bouts of mania" — SUPPORTED.
- "and now used by King Kozrak for crowd control on rebellious worlds." — SUPPORTED, matches "forced into service by King Kozrak, who uses their hypnotic abilities as crowd control on rebellious worlds."

Sign-off test on the last sentence: plain present-tense fact ("now used... for crowd control"), no staged scene, no invented consequence, no metaphor. PASS.

**Hypnosis cap check.** Registry definition of `hypnotic` (section 5.3): "entrances and holds attention, dulling the will to act (caps there)." Canon constraint (section 2): "no puppeting or possession of another body (hypnotic caps at entrancing)." Every occurrence across all three artifacts — the description ("hypnotizes others and locks them in a trance"), the signature description ("stops moving and stands quiet in the trance"), and the encyclopedia ("lock a subject in a trance") — describes the target becoming still and passive, never being made to act, move, or obey a command. This stays inside the cap. No puppeting language anywhere. PASS.

## Step 4: field-by-field audit of hypnopet.json (sections 5.5 to 5.7)

| Field | Value | Verdict | Note |
|---|---|---|---|
| `corporeality` | corporeal | HONEST | body occupies space, "golden-furred bunny rabbits" |
| `composition.primary` | flesh | HONEST | living animal tissue, no stated alternate substance |
| `bodyPlan` | biped | **CONTRADICTED** | art shows forepaws reaching the ground; rule as written gives quadruped (Step 2) |
| `covering` | fur | HONEST | sourced twice, species text and art tufting |
| `anatomy: crest` | for the horn | HONEST, but contested key, correctly flagged | Registry `horns` = "permanent cranial spikes... used to gore" (per anatomy registry text: "external goring teeth... permanent cranial spikes incl. drill-horns"); the Hypnopet's horn has no goring function anywhere in source, its entire function is the emissive color-pulse display that hypnotizes. `crest` = "emissive or display head-growth." This matches function, not literal shape. The walkthrough is right that the registry rewards function over shape here, and flags the contest honestly. This reviewer concurs: `crest` is the better-supported key. |
| `anatomy: claws` | for the paws | Authored, correctly flagged in Authored fields | No claws are visible or described; the art shows small rounded paw pads with faint toe divisions on the front feet and clearer pad/toe marks on the hind feet, not hooked or raking digits. "Claws" (hooking or raking digits) is a stretch for what the art actually draws as soft rounded toes. This is a borderline authored call; flagging it as authored is honest, but the specific key chosen slightly overstates what the art shows. A softer read ("body" as the catch-all, or simply omitting a limb-instrument anatomy key and relying on `crest`/`mind`) would have been equally defensible and more conservative. Not a hard error since claws is at minimum a plausible default for a small mammal's digited feet, but flag as a soft call. |
| `anatomy: hide` | unarmored surface | HONEST | correctly the only legal choice since no armored aspect is shown or stated; `shell` would be wrong |
| `size` | 30-42cm / 9-16kg | HONEST, Authored | reasonable band around the legacy gauge (35cm/13kg), properly labeled as authored and not a source value |
| `lifespan` | short | HONEST | correctly applies cut 3 (flesh body, mass midpoint ~12.5kg, below 20kg, not swarm/conjured/flier-in-numbers) with no post-mass adjustment and no harshness cut, since the planet's harm language ("The environment seemed to change in accordance with the emotions of those who passed through it") is stated of the Vallerii, not the Generator's own Xalians — correctly not misapplied |
| `diet` | herbivore | HONEST, Authored, but see caution below | properly flagged as authored; justified from "bunny rabbits" body-form plus the planet's named plant food source (pitcher plants). Per the diet selection rule, silence on feeding for a flesh body defaults to `omnivore`, not `herbivore`; the walkthrough explicitly overrides that default on the strength of the rabbit-form inference. This is a plausible but not fully rule-compliant call: the rule's silence fallback is `omnivore` for flesh bodies, and the walkthrough's override reasoning ("bunny rabbits" implies herbivore) is an inference stacked on an inference (rabbit-shaped does not, by the letter of the rule, equal herbivore-diet, since the rule's carnivore/herbivore tests are behavior-based, not body-shape-based). This is UNSUPPORTED under a strict reading of the selection rule; the honest fallback per rule is `omnivore`, and the walkthrough should have used that instead of a body-shape shortcut. Flagged as a genuine issue below. |
| `communication: telepathic, display, vocal` | | telepathic HONEST (empathic healing = direct mind impression), display HONEST (color pulse), vocal Authored (correctly flagged, no call/cry sourced) | all three individually defensible |
| `temperatureC` | 12-40 | HONEST | inside planet range 7-65, narrower band argued from "humid, smothering mists" and small-furred-body heat loss/gain logic |
| `size`, `capabilities`, `senses` | various | mostly HONEST or properly flagged Authored | swim/burrow/climb/manipulation/smell all correctly listed in Authored fields; sprint and leap correctly grounded in the art's hind-limb emphasis |
| **Traits** | | | |
| `healing: 100` | body-demanded | HONEST | "natural empathic healing abilities served to balance and treat patients" — stated as inherent, universal |
| `hypnotic: 100` | organ-demanded | HONEST | horn is present on every individual per description, hypnosis is the horn's function |
| `protective: 70` | | HONEST-adjacent, high but plausible | "created... as service animals and therapists" supports a protective disposition; 70 is a judgment call but reasonably argued as non-universal |
| `luminous: 60` | | HONEST | "glowing, golden-furred" is direct textual support for the registry's `luminous` definition ("its body sheds light") |
| `inspiring: 55` | | OVER-CLAIMED, weakly | "many Hypnopets have taken to the stars as healers" does not describe an effect on ally morale; it describes occupation and dispersal. The walkthrough itself admits this ("the sentence is about the role rather than the effect on morale") yet still assigns 55%, a majority-likely trait, on an admittedly weak reading. This should be lower, in the 20s-30s range at most, or justified more directly from the healing/protective throughline instead. |
| `perceptive: 45` | | HONEST-adjacent | reused from the same healing sentence but distinguished as "reading a patient's state," a defensible secondary reading |
| `slippery: 35` | | Authored, correctly flagged, plausible art-inference | small pelted bounding body |
| `mind-sealed: 30` | | HONEST-adjacent | reasonably argued as a minority trait for a species that works inside deranged minds without being immune |
| `pack-bonded: 25` | | Weak but correctly kept low | "taken to the stars as healers" (plural) is thin support; the walkthrough itself notes the sentence is about dispersal not coordination, and prices it accordingly low. Acceptable given the low percent. |
| `telekinetic: 5`, `foresighted: 5` | | HONEST | correctly in the rare band (2-8%), correctly labeled as plausible-on-psychic-species rather than sourced |
| Expected count 5.30 | | Justified, not padding | Two guaranteed traits (healing, hypnotic) are both textually load-bearing — the species' entire reason for existing. The remaining 3.30 expected comes from nine traits none above 70. Given this is explicitly a support/utility species with no combat kit beyond one signature, a heavy passive-trait sheet is a defensible shape rather than padding. Concur with the walkthrough's self-answer to the WARN, with the caveat that `inspiring` at 55 is the one entry that reads as padded relative to its evidence (see above). |
| `instruments: crest, mind, claws` | | HONEST | `crest` present in anatomy and is the effect's physical terminus; `mind` predicate satisfied by psychic element + `senses.special: psychic`; `claws` present in anatomy, minimum honest non-mental instrument, though see the anatomy caution above |
| Authored fields list | | Reasonably complete | Lists anatomy `claws` and `hide`, communication `vocal`, diet, capabilities swim/burrow/climb/manipulation, senses smell, size bands, all attribute bands, signature intensity, and bodyPlan. This is a thorough and honest accounting; the one field that should also have been listed but was not is that `diet: herbivore` overrides the rule's own stated silence-fallback (`omnivore`) rather than simply filling a silence — that is a bigger claim than the walkthrough's Authored fields framing acknowledges, though it is listed. |

## Step 5: signature ability audit

- **Collision scan.** Independently reran a case-insensitive grep for "hypnopet" and "psychedelic reverie" across all `consolidated-*.md` files and `neutral-pools.md` in `docs/ability-catalog/`: zero hits. No reserved name, no prior ruling. Confirms the walkthrough's claim of a clean scan.
- **Registry vocabulary.** `instrument: crest` (in the 34-key anatomy registry), `action: snare` (in the 16-action list), `medium: psychic` (primary element, elemental cover intact). All three are legal registry values.
- **Crest/snare outside the matrix, rule 4 justification.** The `crest` row in section 5.7 allows `beam, burst, terrorize, ward`, not `snare`. Rule 4 (section 5.8) permits a signature to use an instrument outside the species list and "even outside the allowed-actions matrix, but only registry vocabulary." This is a real, applicable exception, not an invented one. The walkthrough's justification — that "locking a target in a trance" matches the registry `snare` definition ("holds, binds, pulls, or pins the target in place") better than any of the four crest-legal actions — holds up: `beam`/`burst` are energy-delivery verbs with no holding sense, `terrorize` acts on courage/will and is explicitly about fear rather than attention, `ward` protects the user rather than acting on a target. `snare` is the only action in the full 16-verb list whose definition matches "locks them in a trance." The justification is real, not a rules-lawyered stretch.
- **Medium cover.** `psychic` is the species' primary element (affinity 100 by definition), so cover is automatic, no rolled-secondary dependency, correctly noted.
- **No mechanics in prose.** Confirmed for the signature description (Step 3) — no HP, damage, or turn language.
- **Name form.** "Psychedelic Reverie": American English, no possessive, no hyphen, no franchise/real-world reference, in a register grander than catalog names, drawing directly from the source's own word "psychedelic." Compliant.

## Step 6: canon compliance across all three files

- **Sexless / no lineage / "it" pronoun:** no gendered language anywhere in description, walkthrough prose, signature description, or encyclopedia entry. PASS.
- **No language, only calls/telepathy/signals:** `communication` array uses only registry values (`telepathic`, `display`, `vocal`); no dialogue or word-based communication implied anywhere. PASS.
- **Lifespan is wear-out, no years:** `lifespan: "short"` is an enum band, no numeric years stated anywhere in the three files. PASS.
- **No reality-breaking powers, hypnotic caps at entrancing:** confirmed in Step 3 — the ability never puppets, never commands action, only stills and holds attention. PASS.
- **No spellcasting, decomposes into a channel/emitter:** the hypnosis is emitted through `crest` (a head-growth), which is registry-legal ("emitted = crest"). PASS.
- **Scrambler Tokens / generation vocabulary:** not invoked in any of these three files (no generation-event prose written), so nothing to check; no crypto-framing language appears anywhere. PASS.
- **Nuclear-age military register:** none present; register throughout is clinical/therapeutic ("service animals," "therapists," "patients," "sedating"). PASS.
- **Voice rules, no em-dash:** current files contain no em-dashes (confirmed by the passing `md.emdash` check in the latest validator run). American English spelling used throughout ("color" not "colour"). PASS.

## Step 7: adversarial scan, descending confidence

1. **(High confidence, material) `bodyPlan: biped` is wrong.** The walkthrough's art paragraph misdescribes the forelimbs as "held clear of the ground against the chest and belly" and "entirely clear of the ground." Direct pixel inspection of the artwork shows the opposite: two small forepaws reach the ground at the same baseline as the hind feet, between and slightly in front of them, with a light belly-fur triangle running down to them. Applying the section 5.5 selection rule to what the art actually shows (not what the walkthrough claims it shows) gives `quadruped`, not `biped`. This is not a case where the rule's text is ambiguous or needs a patch — it is a straightforward misread of the image that happens to also correctly get flagged by the agent's own (accidentally correct) uncertainty in its open question. Nick should rule `quadruped` and the walkthrough's stated reasoning for why `biped` is "what the rule as written says" should be corrected, not treated as a live open question about the rule's drafting intent.

2. **(Medium confidence) `diet: herbivore` is a rule violation dressed as an inference.** Per section 5.5's diet selection rule, when the sources say nothing about feeding, a flesh body defaults to `omnivore`, and that default is explicit and unconditional in the rule text ("take omnivore for a flesh... body" when "the sources say nothing about feeding"). Neither source has a single sentence showing the Hypnopet eating anything. The walkthrough substitutes a body-shape inference ("bunny rabbits" implies herbivore) for the rule's own fallback. This is a plausible flavor call but it is not what the registry procedure specifies, and it was not caught by the script because diet enum membership, not diet selection logic, is what the script checks. Recommend either reverting to `omnivore` per the letter of the rule, or explicitly flagging this as a deliberate departure from the fallback (with Nick's sign-off) rather than presenting it as a straightforward Authored-fields entry.

3. **(Medium confidence) `inspiring: 55` is over-claimed relative to its cited evidence.** The supporting sentence ("many Hypnopets have taken to the stars as healers") describes occupation and dispersal, not an effect on allies' morale or resolve, which is the registry definition of `inspiring` ("its presence bolsters allies"). The walkthrough concedes this gap in its own reasoning ("the sentence names the role rather than the effect on morale") but still assigns a majority-likely 55%. A trait with this thin a textual anchor should sit closer to the `pack-bonded` treatment (25%, explicitly priced down for the same kind of weak evidence) rather than above half.

4. **(Lower confidence, minor) `anatomy: claws` slightly overstates the art.** The front and hind feet in the artwork show rounded pad shapes with faint toe divisions, not hooked or raking digits; "claws" per the anatomy registry are "hooking or raking digits." This was honestly disclosed as Authored, and claws is a defensible minimum-instrument default, but a plain paw/toe read would have been more literal to what is drawn. Not blocking, but worth noting since it also grounds the `instruments: claws` choice and (weakly) the `manipulation` capability band.

5. **(Low confidence, procedural) the jsonl anomaly is explainable, not a defect.** The disappearance of `enc.definition.name` between run 2 and run 3 of the validation log tracks a real fix (the encyclopedia definition being rewritten to open with "The Hypnopet is..."), and the walkthrough's own "Validator warnings answered" section documents that fix. Flagged here only so the discrepancy between run 1/2 and the walkthrough's Script denials section (which mentions only the em-dash FAIL, not the encyclopedia WARN, in that specific subsection) does not read as an omission — the encyclopedia WARN is answered, just in a separate subsection ("Validator warnings answered") rather than "Script denials," which is the correct place for it since it was a WARN, not a FAIL, and the split matches the skill's own vocabulary (FAILs go in Script denials, WARNs go in the warnings-answered treatment). No action needed.

6. **(Low confidence, cosmetic) `protective: 70`** is a high band for a percent whose supporting sentence is about the species' engineered purpose (a disposition) rather than a stated universal instinct; not unreasonable, but on the high side of what "created as service animals and therapists" alone supports without also citing the healing/hypnotic throughline more explicitly. Not flagged as a hard finding, noted for completeness.

## Verdicts

**Template (`hypnopet.json`): FAIL.**
Failing items: `physiology.bodyPlan` is `biped`, contradicted by the artwork under the ratified selection rule (should be `quadruped`); `physiology.diet` is `herbivore`, unsupported under the diet selection rule's explicit silence-fallback to `omnivore` for a flesh body with no feeding sentence in either source.

**Walkthrough (`hypnopet.md`): FAIL.**
Failing items: the art-reading paragraph's forelimb description is contradicted by the source artwork (the specific claim "held clear of the ground... entirely clear of the ground" is false; the art shows the forepaws reaching the ground), which invalidates the bodyPlan judgment built on it; the diet judgment substitutes a body-shape inference for the registry's stated fallback without flagging this as a rule departure requiring sign-off. Additionally, `traits.pool.inspiring` at 55 is over-claimed against its own cited evidence, a softer finding but still a real gap between stated support and assigned percent.

**Encyclopedia (`hypnopet.encyclopedia.json`): PASS.**
All clauses SUPPORTED against source; sign-off test passes on the closing sentence; the earlier `enc.definition.name` WARN was correctly resolved and no longer reproduces.
