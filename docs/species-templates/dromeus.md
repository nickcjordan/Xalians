# Dromeus migration walkthrough

## Art reading

The image is a single black silhouette of one creature, a raptor-shaped theropod caught mid-stride and leaning forward. It stands on two hind legs; the near leg is planted and the far leg is drawn up, and each foot ends in a set of hooked toe claws. The forelimbs are held well clear of the ground, folded up against the chest and ending in three long curved hooked claws that are plainly not bearing weight. Behind the forelimb, a broad fan of stiff pointed plumes projects backward from the arm, read as a feathered wing surface rather than a bird's full airfoil. The head is long, narrow and lizard-like, jaws thrown wide to show two rows of triangular pointed teeth top and bottom, with a small round eye and a raised brow ridge. A long tail sweeps up and forward over the back, tapering to a spray of separated pointed plumes at the tip, and a second smaller plume group sits at the hip. The trunk outline itself is smooth and unbroken, with no tufted, plated, or scaled edge drawn anywhere along it. One body, no shell, no horns, no visible emission structures.

## Lore

The lore block holds three prose fields. `description` is Nick's teaser, carried from `species.json` verbatim and never edited here. `body` and `habits` are authored below under the lore split of 2026-09-09, re-cut from the stub-upgrade draft of 2026-09-08 with the orchestrator's edit applied.

### appearance (8 entries)

- Ground bird with lizard features, on two legs
- Light for its height
- Partly feathered, with bare hide between
- Narrow lizard-like head with jaws of sharp teeth
- Clawed forelimbs held clear of the ground
- Plumed wings along the arms
- Hooked toe claws
- Long plumed tail

Appearance list (Nick, 2026-09-09, second pass after his corrections): one presentation quality per entry; relative size words only; physical presentation only (no sense capability, no behavior); no absent-anatomy entries unless the absence is the form itself; no defaults such as "unarmored"; no definitive claims that would fence future lore; the art is a source for major visible features but never for how a feature is shaped, angled or counted. Every list re-checked against the artwork by the orchestrator on this pass.

### fields (5 of 5)

- **origin**: Magmuth's mining corporations designed it to cross the transient mineral islands, where a cooling lava flow gives only a short window before the ground opens again.
- **habitat**: The hardened lava flats and ash fields of Magmuth.
- **feeding**: It hunts on the flats and eats whatever it can run down.
- **behavior**: It runs. When it reaches speed it spreads its wings, launches itself at its prey, and bites.
- **company**: It runs in packs.

Habits split (Nick, 2026-09-10): the habits paragraph and biomeNiche are struck. Five short fields, one question each, in ordinary language: origin (who generated it and what for), habitat (where it lives now), feeding (how it eats), behavior (how it goes about its business), company (alone, pairs, crews, swarms). All five are required (Nick, 2026-09-10, later the same day): a consumer that reads a field must never find it missing, so where the canon is silent the field carries the plainest reading the record supports, hedged in the encyclopedia voice where the record itself is lost, and Nick rules on it with the rest. Planet history stays in the planet records; a field names the world only where the creature itself is involved. No sign-off lines, no hazard sentences written to justify traits. Draft until Nick signs off.

Fields required (Nick, 2026-09-10): filled company ("It runs in packs."). Source reading: the teaser, the diet key and the planet history; where they are silent the phrase is the plainest reading of the record and is flagged for Nick with the batch.

## Judgment lines

Source abbreviations: `species` is the Dromeus `description` in `species.json`; `planet` is the Magmuth `history` array or `data` block in `planets.json`; `art` is the artwork read above.

### Description status

`upgraded`. The source description is a two sentence stub of 51 words, well under the 60 to 140 word register and with no engineered purpose and no present-day turn. Original: "Partially feathered ground birds with lizard features, these creatures are extremely quick with razor sharp teeth. When running at high speeds, they can spread their wings to temporarily take flight as they launch into the air and sink their teeth into their prey."

Clause by clause in the upgraded text:

- `A partially feathered ground bird with lizard features`: species, "Partially feathered ground birds with lizard features".
- `built long in the leg and narrow in the skull`: art: long hind legs, narrow lizard-like skull. Descriptive of the art only, adds no fact.
- `was designed by Magmuth's corporations`: planet, "These corporations designed all manner of Xalians to help extract the planet's metals, minerals, and gases – creatures capable of adapting to Magmuth's primeval conditions and bioengineered to survive in a world of heat, fire, lava, and ash."
- `as a courier and outrider across the transient mineral islands`: the specific job is my inference from the species' one distinguishing quality, speed, set against planet, "the mineral laden islands that floated atop the planet's molten surface became lucrative mining zones". Flagged under Authored fields; it is the weakest clause in the upgrade.
- `fast enough to cross a cooling lava flow before it opened underfoot`: planet, "The resulting lava flows form into temporary islands due to rapid cooling as the planet swings further out into orbit." Combined with species, "extremely quick".
- `It is extremely quick and carries razor sharp teeth`: species, verbatim facts.
- `At speed it spreads its wings and takes flight for a few seconds, launching into the air to sink its teeth into its prey`: species, "When running at high speeds, they can spread their wings to temporarily take flight as they launch into the air and sink their teeth into their prey."
- `When the company wars turned miners and forge-workers into corporate raiders, the same speed made it a runner between raiding parties`: planet, "The Vallerii began using Xalian miners and forge-workers for combat, converting them into corporate raiders in the truest sense of the word." The runner role is the same courier inference carried forward; flagged under Authored fields.
- `It still runs the ash fields for the blood feuds that outlived the Vallerii`: planet, "Internecine warfare wracks the Magmuthites, fueled by old blood feuds that arose from the company wars of long ago." and planet, "Almost everything on Magmuth is covered in a thick layer of ash". Plain present-tense fact, no staged scene, per the no-sign-off rule.

Word count of the upgraded description: 126. One paragraph, present tense, opens with a body appositive, no em-dashes, American English, no mechanics named.

### Physiology

- `corporeality: corporeal`: species describes a running body with teeth and wings; art shows a solid silhouette.
- `composition.primary: flesh`, no secondary: species, "Partially feathered ground birds with lizard features". Feathers, teeth, flesh; no second structural substance named anywhere. Fire element never decides composition (registry rule).
- `bodyPlan: biped`: the description names it running and calls it a ground bird, and flight is explicitly temporary: species, "they can spread their wings to temporarily take flight". Under the ratified `avian` definition, flight must be the way it moves, and here it is not. Under the `biped` selection rule the art settles the rest: the forelimbs in the art are free of the ground and end in raised hooked claws, which is the stated `biped` test.
- `anatomy: jaws, fangs, claws, talons, wings, tail, hide`: `jaws` from species, "razor sharp teeth" and "sink their teeth into their prey", plus art: the full biting mechanism drawn wide open. `fangs` from species, "razor sharp teeth" and art: rows of long triangular piercing teeth. `claws` from art: the three long hooked forelimb claws held clear of the ground, hooking and raking digits. `talons` from art: the hind foot claws under a body whose weight rides on the legs, the grip-and-pierce set. `wings` from species, "they can spread their wings". `tail` from art: the long tail carried over the back with a plume tip. `hide` as the single surface key: the body is unarmored, no shell, and the registry allows at most one of `hide` and `shell`. No sense organs listed as anatomy, per the registry rule.
- `covering: bare`: species says "Partially feathered", and the ratified covering rule states that a surface the description calls partial is not the covering; the covering is what the rest of the trunk shows, and if nothing shows it, `bare`. The art's trunk outline is smooth, with no tufted, plumed, plated, or scaled edge, so the art shows nothing. `bare` by the stated fallback, and listed under Authored fields. See the notes section: I think this outcome is wrong for this species.
- `size: heightCm [88, 112], weightKg [38, 56]`: legacy gauge is 96 cm and 46 kg, used only as a relative marker. Banded around it at roughly plus and minus 12 percent for height and plus and minus 20 percent for weight, which is realistic spread for a cursorial biped. Magmuth's data block gives gravity as 1.25 times Earth, which argues for a compact light frame at a given height, so the weight band sits lean rather than heavy.
- `lifespan: standard`: the rubric: cut 1 does not apply, cut 2 does not apply, cut 3 puts a flesh body of 47 kg midpoint into the 20 to 200 kg band, which is `standard`. The cut 3 adjustment does not fire: no source calls it cold, slow, or long-lived, and its covering is not armored. Cut 4 does not fire: no source sentence says Magmuth shortens this creature's life.
- `genome.chirality: rolled`: default; nothing about a flesh body with normal chemistry warrants `achiral`.
- `diet: carnivore`: species, "sink their teeth into their prey". The word prey plus a consuming sentence is the ratified settling evidence.
- `communication: vocal, display`: `vocal` is authored, not sourced: no source sentence names a call. `display` rests on art: the wide plume fan on the forearm and the plumed tail tip are classic posture and gesture surfaces. Both flagged under Authored fields; see the open question.
- `breathes: gas` and `ambientMedia: gas`: planet, "The acrid air is thick with volcanic smoke, staining the sky crimson and lacing the atmosphere with sulfuric ash and pungent, toxic fumes." A ground runner on a world with an atmosphere is an air breather; `breathes` is a subset of `ambientMedia` as required.
- `temperatureC: 65 to 240`: planet data block gives "Temperature Low": "65 °C / 149 °F" and "Temperature High": "355 °C / 671 °F". The band sits inside that range. The floor is the planet floor because nothing colder exists on Magmuth. The ceiling stops well short of 355 because this is an ash-field runner on hardened lava crust, not a lava swimmer: planet, "These islands are hot desiccated barrens consisting of hardened lava flows that have become little more than desolate expanses of obsidian and basalt filled with fields of ash and bubbling tar-pits." No source shows it entering molten rock, so the top of the planet range is not claimed.
- `capabilities`: `flight: [15, 35]` for a genuinely brief airborne burst, species, "they can spread their wings to temporarily take flight"; `wings` is in anatomy, so the band is legal above 0. `sprint: [80, 98]` from species, "these creatures are extremely quick" and "When running at high speeds", the only two qualities the source insists on; the band top above 60 is carried by those sentences. `leap: [58, 82]` from species, "they launch into the air", a launch under leg power. `climb: [25, 45]` authored, a bipedal clawed runner scrambling broken ground: planet, "Over time, the islands become scarred with jagged chasms, shattered crags, sharp fissures, and charred, broken cliffs." `swim: [0, 10]` authored, near zero on a world whose liquid is lava. `burrow: [0, 0]`, no source. `manipulation: [20, 38]` sits below the 40 threshold that would require grasping anatomy justification, even though `claws` and `talons` are present; a raptorial forelimb hooks and holds but is not a hand, so I kept it low deliberately.
- `senses`: `sight [70, 90]` for a pursuit hunter that runs prey down and then times an aerial strike; species, "they launch into the air and sink their teeth into their prey" requires closing accurately at speed. `hearing [50, 70]` and `smell [45, 65]` authored at unremarkable animal levels; no source. `special: heat-sense`: planet, "the cracks in the earth glow an eerie red from the magma that seeps up from the planet's many deep and fiery crevasses", and a fast runner on ground that opens into molten fissures needs to read heat ahead of its feet. This is an environmental adaptation supported by a planet-wide sentence, which the rules permit for environment; it is the one special sense and I did not author a second.

### Instruments

- `jaws`: species, "sink their teeth into their prey". The lore-defining act terminates in the jaws. In anatomy.
- `claws`: art: the raised hooked forelimb claws, the only other offensive part the body carries. In anatomy.
- `wings`: species, "they can spread their wings to temporarily take flight". In anatomy.

`conduits`: omitted. Neither the description nor the art shows fire leaving the body through any part. The species is a fire Xalian by generation and planet, but the conduit predicate is strict and sourced, and being of an element never makes a part a conduit. This is the correct read even though it narrows the ability space; see thin-combo findings.

### Archetype weights

`runner 45, predator 30, skirmisher 25`, summing to 100, three entries with a clear dominant. Speed under sustained output is the species' whole identity, so `runner` (agility, endurance) dominates: species, "these creatures are extremely quick" and "When running at high speeds". `predator` (instinct, reflex) is the second reading because the source shows it hunting: species, "sink their teeth into their prey". `skirmisher` (agility, reflex) covers the darting hit-and-away individual, the flight burst version of the same body. I deliberately did not include `berserker` or `vanguard` despite Magmuth's warlike reputation, because that is a planet-wide stereotype (planet, "Magmuthites are stereotyped by other Xalians as being the most aggressive, rebellious, and warlike of their kind.") and a planet-wide sentence may not justify a species behavior. Not a stepped ladder; the gaps are 15 then 5, which say that runner is the species and the other two are real but secondary readings.

### Attribute bands

Legacy `statRatings` used only as a relative gauge: `standardAttackRating: high` and `speedRating: high`, everything else blank.

- `agility [72, 94]` and `reflex [66, 88]`: the two highest, from species, "extremely quick", and legacy speed high.
- `endurance [55, 78]`: a distance runner across island barrens; planet, "desolate expanses of obsidian and basalt filled with fields of ash".
- `instinct [62, 84]`: a pursuit predator timing an aerial strike; species, "they launch into the air and sink their teeth into their prey".
- `strength [38, 58]`: legacy attack is high, but that reflects sharp teeth at speed, not bulk; a 47 kg frame does not carry strength.
- `vitality [35, 55]` and `resilience [28, 46]`: light, unarmored, `covering: bare`, no shell.
- `intelligence [22, 40]`: well below true human range, near the animal-predator end; nothing in the source suggests problem solving.
- `willpower [30, 50]`, `charisma [25, 45]`: unremarkable, no source, authored.

### Trait pool

Pool shape of 2026-09-08. One required trait at 100 and a rolled set of three sharing exactly 100. Expected count: 1 + 100/100 = 2.00. No exclusion pair remains, since both `pack-bonded` and `solitary` were cut by the evidence bar.

#### Required

| Trait | Evidence |
|---|---|
| `ramming` | The behavior the description and the signature ability are both built around. Species: "When running at high speeds, they can spread their wings to temporarily take flight as they launch into the air and sink their teeth into their prey." That is a blow landing far harder with movement behind it, stated of this species rather than of its world. No body fact demands a trait here: the covering is `feathers` and the body is corporeal flesh, so this species carries one required trait rather than two. |

#### Rolled (shares sum to 100)

| Trait | Share | Evidence |
|---|---|---|
| `hardened` | 40 | Strongest of the rolled set. Magmuth's Generator environmental report lists firestorms and ambient temperature excursions among the planet's hazards, gives thermal shielding as the first of its two output priorities, and states heat-shielded integument in its fauna observations with no quantifier. A planet-wide adaptation, and the Dromeus description is about speed and killing rather than about surviving the heat, so it rolls. |
| `resistant` | 35 | Also planet-wide, and one class weaker: it rests on the planet history rather than on a hazards entry. Planet: "The acrid air is thick with volcanic smoke, staining the sky crimson and lacing the atmosphere with sulfuric ash and pungent, toxic fumes." Chemically hostile air is contamination, which is this key rather than `hardened`. |
| `perceptive` | 25 | The weakest class, a record field: `physiology.senses.sight` is banded [70, 90] and the upper bound clears the floor of 80 for a graded band. `senses.special` is empty, so nothing names it species-wide. |

Legacy `statRatings` add nothing to the shares here: `standardAttackRating` and `speedRating` are high, and neither of those maps to a trait.

Traits I considered and left out, so they carry a 0 chance: `armored` (no shell, no plating); `regenerative` (no source); `nocturnal` (Magmuth is not a night world); `volatile` (nothing makes it hazardous to strike); `toxic` (teeth are sharp, not envenomed); `luminous` (the art shows no light organs); `foresighted` and `telekinetic` (no source at all); `healing`, `protective`, `inspiring`, `anchored`, `phasing`, `reflective`, `hypnotic`, `mind-sealed` (each contradicted by or absent from the body and both sources).

#### Cut by the evidence bar (2026-09-07)

| Trait | Former percent | Evidence class that failed |
|---|---|---|
| `pack-bonded` | 55 | Class 3 fails on kind: Magmuth's report notes elevated inter-pack aggression, but a planet-wide fact may carry only an environmental adaptation, never a behavioral trait, and no ratified field states group living. |
| `slippery` | 30 | Class 5 fails: the legacy `evasionRating` for Dromeus is empty, so the one rating that maps to slippery is absent, and no other rating substitutes. |
| `stealthy` | 20 | Argued from absence: a pursuit runner is said not to be an ambusher by nature, with no sentence showing it moving unseen. |
| `menacing` | 15 | Class 2 fails: the art shows the jaws thrown wide inside a mid-stride hunting lunge, which is the attack rather than a threat display, and no threat sentence exists to pair with a size claim. |
| `solitary` | 12 | No source sentence: listed only as the lower half of the exclusion pair. |

### Signature ability

The lore-defining act is the one thing the description spends its second sentence on: species, "When running at high speeds, they can spread their wings to temporarily take flight as they launch into the air and sink their teeth into their prey."

- `instrument: fangs`: the ratified rule is that the instrument is where the effect terminates on the target. The wings produce the closing physics; the teeth are what land. `fangs` is in anatomy, sourced from species, "razor sharp teeth", and the signature is allowed an instrument outside the species instrument list by signature rule 4. I first wrote `jaws`, whose 5.7 row does not carry `ambush`; `fangs` carries it natively, so no rule 4 matrix exception is needed at all.
- `action: ambush`: the ratified definition of `ambush` is a burst of closing speed that ends in a hit, which is a word-for-word match for the source sentence. `ambush` is in the `fangs` allowed-actions row.
- `medium: fire`: the species primary, so it always has element cover regardless of a rolled secondary.
- `intensity [45, 80]`: a wide band: the act depends on how much run-up an individual gets, so the same move lands very differently. Centered above midpoint because the source calls the teeth "razor sharp" and the speed "high".
- `name: Ashfall Stoop`: grander register, coined. Collision scan run case-insensitively over all 14 `consolidated-*.md` files and `neutral-pools.md` for the exact name and for each candidate I considered; zero hits. No ledger note reserving a signature name for Dromeus exists: a case-insensitive search for `dromeus` across all catalog files returned nothing.
- Signature description: `The Dromeus runs its target down, spreads its wings for the few seconds it can stay aloft, and closes the last of the distance with its teeth.` One line, canon voice, no mechanics, plain present-tense fact at the end.

## Authored fields

Values with no supporting source sentence, recorded here because the JSON carries no provenance:

- `covering: bare`: reached by the ratified fallback, not by evidence. See notes.
- `communication: vocal`: no source names a call or cry. Authored as the minimum plausible signal for a flesh animal; it also satisfies nothing else in the template, so it could be dropped to leave only `display`.
- `communication: display`: rests on the art's plume surfaces, which is inference about function rather than a shown act.
- `lore.description` clauses `as a courier and outrider across the transient mineral islands` and `the same speed made it a runner between raiding parties`: the courier role is my inference from the species' speed plus the planet's mining economy, not a stated job.
- `capabilities.climb`, `swim`, `burrow`, `manipulation` bands: bands set from body reasoning, no source sentence.
- `senses.hearing`, `senses.smell`: authored at unremarkable levels.
- `attributes.willpower`, `attributes.charisma`: authored.
- `biomeNiche` phrasing: assembled from planet sentences about ash and hardened lava flows rather than quoted whole.
- `size` bands: legacy figures used as a gauge, the spread is authored.
- Trait percents `stealthy 20`, `menacing 15`, `solitary 12`, `slippery 30`: reasoned from the body, not from a sentence naming the behavior.

## Thin-combo findings

Counted drawable names for each instrument x allowed action x medium combination (primary `fire` plus each on-graph secondary `rock`, `chemical`, `metal`), respecting instrument tags. The smallest element cell touched by this species is `metal / spray` at 22 names and `metal / cloud` at 23, and every neutral pool sits between 43 and 100. Every combination this species can draw clears the 6-name threshold comfortably; the thinnest single combination is `wings x hurl x metal`, which draws from the 51-name metal hurl cell plus the neutral hurl pool. No thin-combo finding to report. I did not pad any cell.

One structural note rather than a thin combo: with no conduit declared, every ability this species rolls is bounded by the physical rows for `jaws`, `claws`, and `wings`, so its fire abilities are all contact-shaped (strike, crush, rake, drain, snare, ambush, shove, lash, hurl, ward). It can never roll a fire `spray`, `burst`, `cloud`, or `beam`. That is the correct consequence of the sources, which never show fire leaving its body, but it is worth Nick knowing that the fire species with the largest fire cells in the catalog cannot reach most of them.

## Script denials

Every FAIL the script raised on any run of this key, with the value I had proposed and what I did.

1. `capabilities.flight`, `swim`, `burrow`, `climb`, `sprint`, `leap`, `manipulation` (7 FAILs, run 1). Proposed: single integers (`flight: 25`, `sprint: 92`, and so on). Script message: `capabilities.<key> must be a [lo, hi] band of integers 0 to 100`. Changed to bands: flight `[15, 35]`, swim `[0, 10]`, burrow `[0, 0]`, climb `[25, 45]`, sprint `[80, 98]`, leap `[58, 82]`, manipulation `[20, 38]`, each centered on the scalar I had written. Legitimate denial and my error: section 4 of the skill shows capabilities as `[lo,hi]` pairs and I wrote scalars. The bands are the better data anyway, since individuals should vary.

2. `md.emdash` (run 1). Proposed: em-dashes as the separator between a judgment label and its reasoning, on 57 spans. Script message: `walkthrough contains an em-dash`. Changed: every em-dash separator became a colon, which is the substitution operating rule 5 names. Legitimate denial; I had read the em-dash ban as applying to in-universe prose and missed that section 3 extends it to the walkthrough explicitly.

3. `md.quote` on the gravity string I had quoted from the Magmuth data block (run 1). Proposed: quoting the Magmuth data block gravity as a single string. Script message: `double-quoted text not found verbatim in species.json, the planet history, or the registry`. Changed: rewritten without quotation marks as a paraphrase, `Magmuth's data block gives gravity as 1.25 times Earth`. Legitimate denial in effect, though the underlying value is genuinely in the source: the data block stores `Gravity` and `1.25 x Earth` as a separate JSON key and value, so the colon-joined string I wrote never appears anywhere. The script is right that no such span exists; my quotation was a fabrication of format, not of fact. No fix requested, since inventing a joined form would be exactly the kind of near-miss quotation the check exists to catch.

4. `md.quote` again on the same gravity string (run 3). This one is a script-shape observation worth recording: writing the denials section honestly meant restating the denied string, and restating it inside double quotes re-tripped the same check on the very sentence that documents the denial. Changed: the denials entry now names the string in prose instead of quoting it. Harmless, but the smallest fix would be for the script to skip the `## Script denials` section when scanning for quotations, since that section exists precisely to record text that failed a check.

Warnings raised and how they were resolved:

- `signature.action.matrix` (run 1): `ambush` sits outside the 5.7 row for `jaws`. Rather than take the rule 4 exception, I moved the signature instrument to `fangs`, which carries `ambush` natively and is already in this species' anatomy. The warning is gone and the signature now needs no exception at all. This was a better outcome than the exception, so I count the warning as having improved the record.
- `signature.description.elementkey` (run 1): the signature description contained the word `air` in `closes the last of the distance in the air`. That is ordinary English, not a type label, so the warning was a false positive on my original wording. I rewrote the line anyway to `closes the last of the distance with its teeth`, which is tighter, so I am not asking for a script change; the check is correctly conservative.
- `enc.definition.name` (run 1): the Encyclopedia definition opened with `A running ground bird of Magmuth` and never said Dromeus. Legitimate; rewritten to open `The Dromeus is a running ground bird of Magmuth`.
- `signature.instrument.list` (run 2, standing): `fangs` is not in the three-instrument list. This is explicitly allowed by signature rule 4, which permits the signature to use an instrument outside the species list. Justified here: the species instrument list carries the parts an individual rolls generic abilities from, and `jaws` covers the biting there; the signature is specifically the tooth-first aerial finish, which is the `fangs` act. Answered, no change.

## Open questions for Nick

Should the Dromeus keep `vocal` in its communication array? Nothing in either source names a call, a cry, or any sound it makes, so I authored it as the minimum plausible signal for a flesh animal with a mouth, and the honest alternative is to drop it and leave only `display`, which at least rests on the plume surfaces the art draws. My recommendation is to keep it, because a running pack animal that coordinates at speed almost certainly signals by sound and the trait pool already leans `pack-bonded`, but I want the call made explicitly rather than left as an unremarked author's guess, since it is the one field where I filled a gap the sources leave completely empty.

## Notes on rules that strained (operating rule 7)

The covering rule forced `bare` on a creature whose description's very first word about its body is "Partially feathered". The ratified rule says a partial surface is not the covering and the rest of the trunk decides, and since the art's trunk outline is smooth the fallback lands on `bare`. I complied. I believe the result is wrong: `bare` reads as smooth unprotected skin, and a reader of this record will not learn that the creature has feathers at all, because the anatomy block has no feather key and `composition` carries only `flesh`. The smallest fix is one sentence added to the covering selection rule: when a source names a partial surface and no other surface is named or shown, take the named partial surface rather than `bare`, since a partial feathering is still more true of the body than smooth bare skin. That would put this species at `feathers` without touching any other rule. I have logged this with a `--note` on the validator run.

## Validator output

Final run after the pool-shape pass of 2026-09-08:

```
0 FAIL, 0 WARN (structurally clean; every WARN must be answered in the walkthrough)
```

The trait checks `traits.pool.required`, `traits.pool.rolledSum` and `traits.pool.size` are all silent.

## Orchestrator amendments

- 2026-09-02, after the independent validation and the orchestrator's own look at the art: the courier and outrider role, the 'runner between raiding parties' clause and the Encyclopedia's 'at speed' labor clause were one invented job; cut, keeping the sourced corporate design and the mineral islands. `senses.special` heat-sense removed: the cited sentence describes the terrain, not a sense. Instruments now `fangs`, `claws`, `wings` (jaws swapped for fangs) so the signature sits inside the instrument list. `communication` keeps `vocal` by orchestrator decision (authored, disclosed). `covering` stays `bare` under the rule as ratified; the partial-surface case is raised to Nick as a lever. Art matched the run's reading (one forelimb drawn, none bearing weight; plumes on wing, tail and hip; smooth trunk; no fire). Description now 94 words.
- 2026-09-02, covering (Nick): `covering` set to `feathers` under the new partial-surface sentence in the covering rule (skill v2.17); was `bare`.
- 2026-09-02, planet rebuild: `temperatureC` re-banded from [65, 240] to [65, 105] (intersection) against the rebuilt planet record's habitable band [40, 105] C; the old band was validated against the legacy planetary extremes, which are not survivable. Any gravity figure cited in this walkthrough predates the rebuild; the current value is `physical.derived.gravityEarth` = 1.53.
- 2026-09-07, trait evidence bar (Nick): cut `pack-bonded`, `perceptive`, `slippery`, `stealthy`, `menacing`, `solitary`; pool expected count 3.17 to 1.52.
- 2026-09-07, trait evidence bar iteration two (Nick): restored `perceptive` (40, class 4); cut nothing further, since `resistant` rests on Magmuth's sulfuric ash and toxic fumes rather than on heat alone; expected count 1.52 to 1.92.
- 2026-09-08, trait evidence bar iteration three (Nick): added `hardened` (100, Magmuth thermal shielding priority and the universal heat-shielded integument observation); raised nothing; cut nothing, since `perceptive` rests on a sight band whose upper bound is 90 and `resistant` on chemically hostile air; expected count 1.92 to 2.92.
- 2026-09-08, pool shape (Nick): required `ramming`; rolled `hardened` 40, `resistant` 35, `perceptive` 25; expected count 2.92 to 2.00.
- 2026-09-09, lore split (Nick): description reverted to species.json; body and habits authored; descriptionStatus removed.
