# Figzy migration walkthrough

## Reading of the artwork

The art shows a single small creature standing upright on two digitigrade legs, weight braced back on one leg, with both forelimbs held free of the ground and raised in front of the chest. The forelimbs end in small five-fingered hands with the fingers splayed open, doing no weight-bearing work. The head is dominated by two enormous shaggy ears that flare wider than the skull, a pair of slender branched antlers rising from the crown, two very large round eyes with bright highlights, and a small blunt muzzle. The whole outline is drawn with tufted, ragged edges along the ears, cheeks, chest, forelimbs and thighs, which reads as a shaggy coat rather than a smooth surface. Off to the creature's side and clearly separated from the body floats a many-pointed starburst with a hollow center, positioned in front of the raised hands, so the art shows a projected release of energy leaving the hands and arriving at a short distance from the body. One creature, one body; no wings, no tail, no visible plating or shell.

## Description status

The legacy description is a two-sentence stub, so `descriptionStatus` is `upgraded`. Source stub, verbatim: "What this creature lacks in stature it makes up for with its incredible magical abilities. It is deceptively smart, yet known to be docile when it trusts you."

### Upgraded description, clause by clause

| Clause in the upgraded text | Source |
|---|---|
| `A small antlered forager with outsized ears, wide unblinking eyes and a shaggy coat` | species stub: "What this creature lacks in stature it makes up for with its incredible magical abilities." (small stature) plus `art:` antlers, oversized ears, large round eyes, tufted coat outline. `forager` is a connective describing a small ground-dwelling body and adds no event. |
| `carries in its raised hands more force than its stature admits` | species stub: "What this creature lacks in stature it makes up for with its incredible magical abilities." plus `art:` both hands raised, starburst projected in front of them. `magical abilities` is rendered as projected force because section 2 bans spellcasting. |
| `The Telypso Generator built it to counterbalance the unstable auras of the Vallerii marooned planetside` | planet: "As if sensing their unstable auras, the Generator began churning out new forms of life, Xalians whose psychic energies could be used to counterbalance those of the brainsick creatures that ever-more-increasingly began to populate the planet." and "the Xalian Generator was forced to kick itself into gear when the most insane and demented of the Vallerii race began finding themselves marooned planetside." |
| `treating the prisoners as patients rather than removing them` | planet: "Instead, the Generator began to treat the prisoners as patients, hoping to cure them and merge them into the mind of the rest of Telypso’s psychosphere." and "It would have perhaps seemed pertinent for the Generator to create Xalians tasked with removing such Vallerii from the world’s jungles, but the code of the Generator, or perhaps the consciousness of the planet, seemed intent on assimilating them into its fold." |
| `one of the small psychic bodies that emerged from the fungal forests` | planet: "Soon, psychic Xalians capable of targeting and influencing emotion, thought, and perception were emerging from the fungal forests – creatures that could enter dreams or induce hypnosis - all in the hopes of harmonizing Telypso’s life, both old and new." |
| `to steady what the deranged left behind` | planet: "As the Vallerii began to spread, their intrusive thoughts and erratic behaviors began to twist the world, leaving psychic impressions that had to be rectified in order to keep Telypso in harmony." |
| `It is deceptively smart and goes docile with anything it has come to trust.` | species stub, verbatim content: "It is deceptively smart, yet known to be docile when it trusts you." |
| `The Nemesis Plague now turns the creatures of Telypso against one another` | planet: "The End Wars have brought the Nemesis Plague to Telypso’s sanctuaries, and the world now screams in psychic pain." and "Reverberating through its mushroom forests comes great waves of spiritual sorrow and suffering, tainting the creatures of Telypso and turning them against one another." |
| `and a Figzy that has settled on no one raises its hands at everything that moves.` | the present-tense fact that joins the stub's trust condition to the plague sentence above; `raises its hands` is `art:`. No event is staged and no new fact is introduced: it states what the creature does now. |

Word count of the upgraded description: 117, inside the 60 to 140 band. No em-dashes, American English, one paragraph, present tense.

## Buried-auto-trait pass

Traits the body demands at 100: none. The body has no armored covering (`fur`), is corporeal (so no `phasing` at 100), is not rooted (`anchored` does not apply), and does not shed light. No trait is written at 100 for Figzy, which is legal: the constraint is only that at least one listed trait sits below 100 and that the two exclusion partners are never both at 100.

Traits the environment demands at or near 100: none. Telypso is not a world of perpetual night, and its `data` block gives a warm, humid, bright band rather than a hazard the body must be immune to. `nocturnal` is therefore not listed at all.

Traits the description or the art merely suggests, at a justified percent: the pool below.

## Physiology, judgment by judgment

| Field | Value | Evidence |
|---|---|---|
| corporeality | `corporeal` | `art:` a solid single body with a drawn outline, opaque throughout, standing on the ground. Nothing in the stub or the planet history says the Figzy is non-corporeal. |
| composition primary | `flesh` | `art:` a furred animal body with muscle, limbs and a muzzle. Section 5.5: the element never decides a physiology value, so a psychic-element creature is not `energy`. No secondary: no source shows a second structural substance. The antlers are cranial growth and go in anatomy, not composition. |
| bodyPlan | `biped` | `art:` the creature stands and moves on two legs, and the forelimbs are free of the ground and end in open hands. Section 5.5 selection rule: `a creature whose forelimbs in the art are free of the ground and end in hands, fists, claws held up, tools, or wings is` biped. The description names no leg count, so the art decides. |
| covering | `fur` | `art:` the outline itself is drawn as tufted and shaggy along the ears, cheeks, chest, forelimbs and thighs. Section 5.5: `the art shows a surface only when the outline itself is drawn as that surface (tufted or shaggy edges for` fur`)`. |
| anatomy `antlers` | present | `art:` a pair of slender branched racks rising from the crown. Section 5.6 defines `antlers` as a branched rack. |
| anatomy `claws` | present | `art:` the hands are drawn with distinct splayed digits held up and free of the ground. Section 5.6 defines `claws` as hooking or raking digits, and it is the grasping key that justifies a `manipulation` upper bound above 40. Flagged in Authored fields as an art-only key: the digits are visible but the sources never name them fighting. |
| anatomy `hide` | present | `art:` a furred, unarmored body surface. Section 5.6: `hide` is an unarmored body surface used defensively, and declaring it states the body has no armored aspect, which is true here. `shell` is therefore absent; the one-surface-key rule holds. |
| anatomy `body` | present | Section 5.6 universal fallback; section 8 names Figzy as a species whose description names no clean part and says the authored minimum must include at least `body`. |
| size | 95 to 125 cm, 34 to 52 kg | Legacy `46 in / 116 cm` and `108 lbs / 48 kg` used only as a relative gauge per operating rule 6, and the stub's "What this creature lacks in stature it makes up for with its incredible magical abilities." fixes the species as small. A band around a light, slender furred biped of roughly a meter. |
| lifespan | `standard` | Section 5.5 rubric. Cut 1 and 2 do not apply (flesh). Cut 3 by mass: the weight band midpoint is 43 kg, which is `20 kg up to and including 200 kg`, so `standard`. The adjustment does not apply: no source calls the body cold, slow, or long-lived, and the covering is `fur`, not armored. Cut 4 does not apply: no source sentence says Telypso's environment shortens a Xalian's life. |
| genome.chirality | `rolled` | Default; a flesh body has chiral chemistry, so `achiral` is not declarable. |
| diet | `omnivore` | Section 5.5 fallback: `When the sources say nothing about feeding, take` omnivore `for a flesh, slime, or gas body`. Neither the stub nor the planet history shows the Figzy consuming anything. Listed under Authored fields. |
| communication `telepathic` | present | planet: "Soon, psychic Xalians capable of targeting and influencing emotion, thought, and perception were emerging from the fungal forests – creatures that could enter dreams or induce hypnosis - all in the hopes of harmonizing Telypso’s life, both old and new." The harmonizing work is signaling between minds; section 5.5 defines `telepathic` as signaling by direct impression, feeling and image, never words. Note this is a planet sentence used for a communication mode, which is a body-and-environment fact for a Generator-made psychic species, not a behavior weight. |
| communication `display` | present | `art:` the enormous flared ears, the raised open hands and the braced posture are a posture-and-gesture signal. Section 5.5 defines `display` as signaling by posture, color, light pattern, or gesture. |
| breathes / ambientMedia | `["gas"]` / `["gas"]` | planet `data` block Terrain `Dense Flora, Rivers, Flourescent Mist` and the history's "Towering forests of mushrooms ascended from humid, smothering mists" put the creature in an atmosphere. `breathes` is a subset of `ambientMedia` as required. No source shows it living in liquid or vacuum. |
| temperatureC | 12 to 44 | Planet `data` block: `Temperature Low` 7 °C, `Temperature High` 65 °C. The band sits strictly inside that range as a narrower sub-band. Justified from the history's humid jungle register ("Towering forests of mushrooms ascended from humid, smothering mists") and from a small furred body, which favors the mild middle of the planetary range and not its 65 °C ceiling. |
| capabilities flight 0 | 0 | No wings in the art, body plan is `biped`, body is corporeal: section 5.5 requires one of those for a flight band above 0. |
| capabilities swim 10 to 30 | low | planet: "Telypso’s rivers shimmered with quicksilver qualities, their colors swimming like oil on water." Rivers exist, but no source shows the Figzy in them; a low nonzero band for a land biped. |
| capabilities burrow 0 to 10 | near zero | No source shows it moving through ground. |
| capabilities climb 35 to 60 | moderate | `art:` splayed digits on free forelimbs and a light frame in a forest world; planet: "Towering forests of mushrooms ascended from humid, smothering mists". Upper bound stays at or under 60 so no source sentence is required. |
| capabilities sprint 55 to 80 | high | Legacy `speedRating: "high"` as a relative gauge (operating rule 6), plus `art:` long digitigrade legs in a braced running stance. Upper bound above 60 is carried by the art's leg build. |
| capabilities leap 40 to 65 | moderate | `art:` digitigrade hind legs with a deep hock, the build that clears distance in one bound. |
| capabilities manipulation 45 to 70 | moderate to high | `art:` open five-fingered hands held free of the ground; `claws` is in anatomy, which section 5.5 requires for an upper bound above 40. |
| senses sight 55 to 80 | high | `art:` two very large round eyes occupying much of the face. |
| senses hearing 65 to 90 | very high | `art:` two enormous ears flaring wider than the skull, the largest features on the body. |
| senses smell 30 to 55 | moderate | `art:` a small blunt muzzle; nothing emphasized. |
| senses.special `psychic` | present | Section 5.5 defines `psychic` as sensing minds, feelings and intent directly. planet: "Soon, psychic Xalians capable of targeting and influencing emotion, thought, and perception were emerging from the fungal forests – creatures that could enter dreams or induce hypnosis - all in the hopes of harmonizing Telypso’s life, both old and new." Targeting and influencing perception requires sensing it. This also satisfies the `mind` channel predicate. |

## Instruments

Two instruments.

- `mind` (channel). Predicate satisfied twice over: the species primary element is `psychic`, and `senses.special` contains `psychic`. Evidence for it being the working instrument: species stub "What this creature lacks in stature it makes up for with its incredible magical abilities."; section 2 bans spellcasting, so a projected power decomposes to a channel, and a willed one is `mind`.
- `claws` (physical, present in anatomy). `art:` the splayed digits on the raised forelimbs are the only physical parts the creature holds ready. A small body needs one physical answer at contact range.

`antlers` was considered and left out of the instrument list: no source shows the Figzy using them to fight, and the art shows the hands forward, not the head lowered.

## Archetype weights

| Archetype | Weight | Reason |
|---|---|---|
| `sage` (intelligence, willpower) | 5 | species stub: "It is deceptively smart, yet known to be docile when it trusts you." Deceptive smartness plus the restraint of docility is intelligence held by will. |
| `seeker` (instinct, intelligence) | 3 | `art:` outsized ears and eyes; a body built to notice, paired with the stub's smartness. |
| `skirmisher` (agility, reflex) | 3 | Legacy `speedRating: "high"` as a relative gauge, plus `art:` the light braced stance on long legs. |
| `virtuoso` (intelligence, charisma) | 2 | The projected power in the art is a performed act from a small body, and the stub makes the creature legible enough to be trusted. |
| `prowler` (agility, instinct) | 1 | Small forest body in dense flora; a minor read, weighted lowest. |

## Attribute bands

| Attribute | Band | Reason |
|---|---|---|
| strength | 12 to 32 | species stub: "What this creature lacks in stature it makes up for with its incredible magical abilities." Physical force is what it lacks. |
| vitality | 25 to 48 | A body under 55 kg has little life force to spend. |
| endurance | 30 to 55 | Nothing in the sources marks it as a long-output body; middle-low. |
| agility | 55 to 82 | Legacy `speedRating: "high"` as a relative gauge; `art:` light frame, long digitigrade legs. |
| reflex | 50 to 78 | `art:` a braced, ready stance with hands already up. |
| intelligence | 58 to 84 | species stub: "It is deceptively smart, yet known to be docile when it trusts you." Top of band stays well under true-human range per section 5.1. |
| willpower | 55 to 80 | The engineered purpose is counterbalancing other minds; planet: "As if sensing their unstable auras, the Generator began churning out new forms of life, Xalians whose psychic energies could be used to counterbalance those of the brainsick creatures that ever-more-increasingly began to populate the planet." |
| instinct | 45 to 70 | `art:` the ears and eyes; moderate-high but not a predator's read. |
| charisma | 40 to 68 | species stub: "It is deceptively smart, yet known to be docile when it trusts you." Trust is a two-way presence. |
| resilience | 18 to 40 | No armored covering, no plating, small light frame. |

## Element

Primary `psychic`, fixed by the species entry's `type` of `Psychic`. Secondaries are whatever the graph allows for Telypso: `ghost`, `light`, `dark`. `affinityOdds` is omitted, so the species inherits the 75/25 baseline; no source justifies an override.

## Trait pool

Independent percents; a trait not listed has a 0 chance.

| Trait | Percent | Reason |
|---|---|---|
| `perceptive` | 70 | `art:` the two enormous ears and two very large eyes are the dominant features of the body, and the species carries the `psychic` special sense. This is a body fact, not a planet-wide inference. |
| `hypnotic` | 45 | planet: "Soon, psychic Xalians capable of targeting and influencing emotion, thought, and perception were emerging from the fungal forests – creatures that could enter dreams or induce hypnosis - all in the hopes of harmonizing Telypso’s life, both old and new." This is the Generator's stated output class for the species' own kind and its own planet, so it is an origin fact rather than a behavior read off a planet-wide sentence; kept well under 100 because the sentence covers a class, not this species specifically. |
| `telekinetic` | 35 | `art:` the starburst floats free of the body in front of the raised open hands, which is an effect acting at a distance without contact; species stub: "What this creature lacks in stature it makes up for with its incredible magical abilities." Above the 2 to 8 percent rarity band because the art shows it directly, but well short of universal. |
| `protective` | 35 | planet: "Instead, the Generator began to treat the prisoners as patients, hoping to cure them and merge them into the mind of the rest of Telypso’s psychosphere." The engineered purpose is care rather than removal. |
| `healing` | 30 | Same sentence: patients and curing. The Generator's purpose for this class of Xalian is restorative. |
| `mind-sealed` | 25 | The engineered job is to counterbalance unstable auras, which means working close to minds that break others; planet: "Soon, the Vallerii who had landed on the ephemeral world of Telypso had become paranoid and deranged, falling into various trances and states of hypnosis." A minority of individuals hold against it. |
| `slippery` | 25 | `art:` a small light body on long legs with nothing for a hand to close on; agility band is high, which is the registry tilt for this trait. |
| `inspiring` | 20 | species stub: "It is deceptively smart, yet known to be docile when it trusts you." A creature that can be trusted bolsters what it stands with. |
| `stealthy` | 20 | `art:` a small quiet body in a forest world; kept low because no source sentence shows the Figzy hiding. |
| `pack-bonded` | 20 | planet: "The whole of Telypso was like a single living thing, a shared dream among all those who landed upon it, except that the dreamer had gone mad beyond all sense of reason." plus the harmonizing purpose, which is coordination between minds. `solitary` is not listed at all, so the exclusion pair never both sits at 100. |
| `foresighted` | 8 | Rare band per section 5.3. The species has the `psychic` special sense, so reading a moment early is within its register, but no source shows it. |

Expected trait count: (70 + 45 + 35 + 35 + 30 + 25 + 25 + 20 + 20 + 20 + 8) / 100 = 3.33.

Traits the body could plausibly carry that I left out, with reasons: `luminous` (Telypso glows, but the art draws no light organ on the body and the planet's glow is not the creature's); `nocturnal` (Telypso is not a night world); `solitary` (nothing in the sources shows the Figzy alone, and listing it against `pack-bonded` would add noise for no evidence); `armored`, `anchored`, `ramming`, `toxic`, `volatile`, `reflective`, `regenerative`, `resistant`, `phasing`, `menacing` (no source or art support; `menacing` in particular is contradicted by the stub's docility).

## Signature ability

Lore-defining act, quoted: "What this creature lacks in stature it makes up for with its incredible magical abilities." The art fixes what that looks like: both hands raised and open with a many-pointed starburst released in front of them, separate from the body.

- Ledger check: searched every `consolidated-*.md` and `neutral-pools.md` case-insensitively for `figzy`; zero hits, so no reserved signature name or ratified instrument, action, or medium exists for this species.
- Instrument `mind`. Per the section 10 ruling the instrument is where the effect terminates on the target, not the physics that produces it. Nothing of the Figzy's body reaches the target: the hands stay by the chest and the released force arrives on its own, so the effect terminates as a willed projection, which section 2 decomposes to the `mind` channel. Predicate satisfied by the `psychic` primary element and the `psychic` special sense.
- Action `burst`. Section 5.5 defines `burst` as an outward release from the body that hits everything close at once. `art:` the starburst radiates in every direction from a hollow center rather than travelling as a line, so it is not `beam`, and it leaves the body rather than being held, so it is not `crush`. Signature rule 4 permits an instrument and action pairing outside the allowed-actions matrix, which this is, since `mind` does not list `burst`.
- Medium `psychic`. The species primary element, so element cover is satisfied.
- Intensity band 35 to 85. Wide, because the stub makes the power the creature's whole compensation for its size but nothing sets a ceiling.
- Name `Small Hands of the Psychosphere`. Grander register, exempt from the two-word limit. Collision scan: searched every `consolidated-*.md` and `neutral-pools.md` case-insensitively for the exact string; zero hits. It joins the art's raised hands to the planet's own term from "Instead, the Generator began to treat the prisoners as patients, hoping to cure them and merge them into the mind of the rest of Telypso’s psychosphere." No possessives, no hyphens, American English.
- Description: `The Figzy raises both hands and the force it has been holding back leaves them all at once, striking everything close to what it stopped trusting.` One line, canon voice, no mechanics named, no em-dash, ends on a plain present-tense fact.

## Catalog check through the species lens

Combos are instrument x allowed action x medium, with media `psychic` (primary), `ghost`, `light`, `dark` (on-graph secondaries). Counts are the element cell plus the neutral pool for that action; instrument tags are respected (both `mind` and `claws` are common tag targets, and the neutral pools are untagged).

`mind` allows snare, shove, hurl, crush, drain, ward, terrorize, mend. `claws` allows strike, rake, crush, shove, ambush.

Cell counts by element: psychic (strike 85, lash 38, rake 12, shove 62, drain 84, ambush 34, beam 52, hurl 45, spray 53, burst 124, cloud 112, snare 72, crush 54, ward 119, mend 119, terrorize 122); ghost (strike 160, rake 111, shove 69, drain 173, ambush 96, hurl 31, snare 171, crush 25, ward 65, mend 29, terrorize 224); light (strike 253, rake 194, shove 155, drain 126, ambush 65, hurl 139, snare 98, crush 18, ward 80, mend 80, terrorize 57); dark (strike 331, rake 228, shove 496, drain 133, ambush 87, hurl 44, snare 85, crush 129, ward 98, mend 10, terrorize 82). Every neutral pool is 43 or larger.

Thin-combo findings: none. The smallest element cell touched by a Figzy combo is `light` crush at 18 and `dark` mend at 10, and both clear the threshold of 6 on the element cell alone before the neutral pool is added. No combo falls under 6 drawable names.

## Authored fields

Values with no source sentence, recorded here because the JSON carries no provenance:

- `diet: omnivore` : section 5.5 fallback for a flesh body when the sources say nothing about feeding.
- `anatomy: claws` : the digits are visible in the art but no source names them being used; the key is authored to give the body one honest grasping part and to carry the manipulation band.
- `anatomy: body` : the section 5.6 universal fallback, required by section 8 for this species.
- `anatomy: hide` : derived from the art's furred, unarmored surface rather than from any sentence.
- `capabilities: swim, burrow, climb, leap` : no source sentence; bands set from the body plan and the forest terrain, all upper bounds at or under 65.
- `senses.smell` : no source sentence; a moderate band from the art's small muzzle.
- `size` bands and all ten `attributes` bands : proposed absolutes per operating rule 6, anchored to the legacy figures used only as a relative gauge.
- `genome.chirality: rolled` : the default.
- `lore.biomeNiche` : phrased from the planet history's fungal forests and bioluminescent jungles, not quoted as one sentence.
- `signatureAbility.intensity` band : no source sets a ceiling.
- Every trait percent : the traits themselves are justified above, but the exact numbers are authored judgments.

## Validator WARN answers

1. `signature.action.matrix`: `signature action "burst" is outside the allowed set for mind [snare, shove, hurl, crush, drain, ward, terrorize, mend] (allowed by rule 4; justify)`. Answered: this is deliberate and permitted. Section 5.8 signature rule 4 states the signature may use an instrument outside the species list and even outside the allowed-actions matrix, provided it uses only registry vocabulary, which `mind` and `burst` both are. The justification is the art: the starburst radiates from a hollow center in every direction rather than travelling as a line or being held closed, which is exactly the section 5.5 definition of `burst` as an outward release from the body that hits everything close at once. The alternatives inside the matrix all misdescribe the picture: `crush` is pressure applied and held, `hurl` needs a thrown solid, `shove` moves the target rather than wounds it, and `beam` is a focused line. The matrix has no outward-release action for a willed projection, which is the gap rule 4 exists to cover.

2. `enc.definition.name`: `definition does not name the species`. Answered by correction, not argument: the Encyclopedia definition now opens `The Figzy is a small antlered forager generated by the Telypso Generator ...`, which leads with the species name and the category noun as the section 3 Encyclopedia register requires. This WARN no longer appears in the final run.

## Script denials

Two FAILs were raised on the first run. Both were legitimate denials and both were fixed; neither cost me an idea, and no `--note` was needed.

| Code | Original value | Script message | Changed to | Was the original better? |
|---|---|---|---|---|
| `capabilities.flight` | `"flight": 0` | `capabilities.flight must be a [lo, hi] band of integers 0 to 100` | `"flight": [0, 0]` | No. The script is right: section 4 declares every capability as a `[lo, hi]` band, and a scalar was my shape error, not a judgment. The meaning is unchanged, since a flightless biped with no wings has a band of exactly zero. |
| `md.emdash` | Eleven em-dashes used as the separator in the Authored fields bullet list | `walkthrough contains an em-dash` | Colons | No. Section 3 bans em-dashes anywhere in prose I write and the operating rules repeat it; these were mine, not quoted source text, so the denial was correct. The verbatim planet quotes elsewhere in this file use en-dashes and hyphens as the source does, and the script correctly did not flag those. |

## Validator output

```
WARN signature.action.matrix        signature action "burst" is outside the allowed set for mind [snare, shove, hurl, crush, drain, ward, terrorize, mend] (allowed by rule 4; justify)

0 FAIL, 1 WARN (structurally clean; every WARN must be answered in the walkthrough)
logged to docs/species-templates/validation-log/figzy.jsonl
```

## Open questions for Nick

1. The art shows the Figzy releasing its power as an outward starburst, so I gave the signature the action `burst` on the `mind` channel, which sits outside the allowed-actions matrix and rides on signature rule 4. Reading down the matrix, `mind` has no outward-release action at all: it gets snare, shove, hurl, crush, drain, ward, terrorize and mend, so any willed power that goes off in every direction rather than reaching for one target has to leave the matrix. Is that a gap you want closed by adding `burst` to `mind` in the registry, given that other psychic species will hit the same wall, or do you want it to stay a rule 4 exception so that an outward psychic release is always the rare signature move and never a rolled ability?

2. I did not list `nocturnal` at any percent. Telypso's history describes an ultraviolet sun, bioluminescent jungles and shifting light rather than a night world, and the `data` block gives no day-length information, so I read the planet as having no night adaptation to demand. If you read Telypso's glowing forests as a low-light environment in practice, `nocturnal` would belong in the pool at something like 30 percent and I would add it.

3. The stub's phrase `known to be docile when it trusts you` is the only behavioral fact the species owns, and I built the description's closing sentence and three trait entries (`protective`, `inspiring`, `pack-bonded`) on the trust reading. That word `you` is also the only second-person address anywhere in the source material, which suggests the Figzy is a creature Vallerii handlers actually kept close. Do you want that handler relationship stated in the description as a fact of the species, or is the trust condition better left as the abstract disposition I wrote it as?

## Orchestrator amendments

- 2026-09-02, after the independent validation: 'forager' and 'unblinking' cut from the description (neither source shows feeding or blinking); the closing clause now keeps the planet history's own scope ("against one another") instead of 'everything that moves'; the signature description drops its unsourced 'everything close to what it stopped trusting' clause; the Encyclopedia definition rewritten to the stub's own words. `claws` replaced by `fists` in anatomy and instruments: the art draws open five-fingered hands, and `fists` (blunt striking hands) is the registry key for hands, while `claws` means hooking or raking digits. Manipulation stays above 40 on grasping anatomy (`fists`).
- 2026-09-02, conduits (Nick): `conduits` {"mind":"psychic","fists":"psychic"}. mind and fists conduct psychic: the stub speaks of its incredible magical abilities and the art shows force leaving the raised hands; the signature (mind, burst) no longer needs the rule 4 exception.
