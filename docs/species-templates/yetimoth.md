# Yetimoth migration walkthrough

## Art reading

The artwork is a flat black silhouette of a single creature, front-on, standing upright on two legs. The head is a mammoth's: broad domed skull, two large fanned ears set wide, a long segmented trunk hanging down the center of the chest and curling forward at the tip, and two enormous curved tusks that sweep out from beside the trunk, arc up and outward past the width of the shoulders, and end in points level with the ears. The tusks are drawn in outline with cracked, faceted interior lines rather than filled solid, which reads as translucent material rather than bone. Below the head the body is a heavy shaggy ape torso: sloped shoulders wider than the hips, no neck to speak of, and two long arms that hang free at the sides and end in closed blocky hands with the thumb and knuckles picked out. The arms do not reach the ground and bear no weight. The two legs bear the whole body; the near leg is drawn stepping forward with a broad flat foot and visible toes, the far leg trailing. The outline of the arms, flanks, and thighs is drawn in ragged tufted edges all the way around, which reads as a shaggy pelt. One body, one head, no wings, no tail visible, no spines, no visible armor plates.

## Description status

`source`. The species.json description is one paragraph, present in the full register: it opens with a body appositive ("Hulking, white-furred apes with the heads of mammoths and tusks made of pure ice"), states the engineered purpose ("the Yetimoths formed the rank and file of Krystos' prisonguards in ancient times"), and turns to what the body does in the field. It is carried verbatim, including its original double space, and no clause was added.

## Judgments

Every line names its source. `species` = the Yetimoth entry in species.json; `planet` = the Krystos history or data block in planets.json; `art` = the artwork.

### Physiology

- corporeality `corporeal` : species: "Hulking, white-furred apes with the heads of mammoths and tusks made of pure ice". A furred body that is struck and struck back at.
- composition primary `flesh` : species: "white-furred apes". Living animal tissue under a pelt.
- composition secondary `mineral` : species: "tusks made of pure ice". Ice held as a permanent structural part of the body (a pair of goring teeth) is a substance of the resting body, not a coating or an emission, which is exactly the case section 5.5 names for a secondary (crystal horns on a furred body). Ice as a solid held in shape is `mineral`; there is no ice composition key.
- bodyPlan `biped` : art: the two legs bear the whole body and the forelimbs hang free of the ground ending in closed hands; species: "pummel them into submission with their meaty, ice-gauntleted fists" names the forelimbs doing work, which settles biped over any other reading. No wings, so avian and floating do not apply.
- anatomy `tusks` : species: "tusks made of pure ice"; art: two large curved external goring teeth. Registry: tusks is external goring teeth.
- anatomy `trunk` : art: a long segmented muscular snout hanging from the center of the face and curling at the tip. Sourced from the art, which section 1 puts on equal footing with the text for the body. The text names only "the heads of mammoths", which does not name the part; the art does.
- anatomy `fists` : species: "their meaty, ice-gauntleted fists"; art: closed blocky hands. Registry: fists is blunt striking hands.
- anatomy `hide` : species: "white-furred apes" and "covering themselves in a near-impenetrable armor". The resting body surface is fur with no armored aspect; the armor is formed on demand, which section 5.5 rules is an ability and never a covering. `hide` is therefore the correct single surface key and `shell` is excluded. One surface key only, per section 5.6.
- anatomy omissions: no `jaws` (the description never shows it biting and the art shows no mouth), no `claws` (the art draws closed fists, not hooking digits), no `spines`, no `tail` (none visible in the art).
- covering `fur` : species: "white-furred apes"; art: ragged tufted outline all the way around the arms, flanks, and thighs, which is the outline drawn as a pelt. The on-demand ice sheets are an ability, not the covering.
- size `heightCm [205, 255]`, `weightKg [330, 470]` : species: "Hulking" and "If their enormous size and strength was not enough". Legacy gauge was 229 cm and 390 kg, used only as a relative position; the band is centered near it and widened to realistic absolutes for an ape of that build under a gravity of 1.2 times Earth from the planet data block, which favors a stockier, denser frame than an Earth ape of equal height.
- lifespan `long` : rubric cut 3: a flesh body whose band midpoint is 400 kg, above 200 kg, is `long`. No adjustment: the description does not call it cold, slow, or long-lived, and its covering is fur, not an armored covering. Cut 4 does not apply: the planet history never says the environment shortens Krystian lifespans; it says the opposite, planet: "a rugged new generation of Xalians emerged ready to take on the winter storms."
- genome.chirality `rolled` : a flesh body has chiral chemistry; no source declares otherwise.
- diet `omnivore` : Authored. No source sentence shows the Yetimoth feeding on anything. The selection rule's default for a flesh body with no feeding sentence is omnivore. The description shows it fighting and guarding only, which the rule explicitly says is not evidence of feeding.
- communication `vocal`, `display` : Authored, see Authored fields. No source sentence names a call or a signal.
- breathes `gas`, ambientMedia `gas` : species: a furred land ape; planet: "An explosion of oxygen-producing algae deep beneath the ice of Krystos' frozen oceans, fed by the nutrients given off by geothermal vents connected to the planet's molten core, helped breathe new life into the snowball planet". An oxygen atmosphere the surface Xalians live in. Not liquid: nothing shows it swimming or living under the ice.
- temperatureC `-122` to `-10` : planet data block: Temperature Low is -122 °C and Temperature High is -10 °C, so the band is the full planet range. The full range is taken rather than a sub-band because the description shows the species working inside the prison complexes while planet: "those who were tough enough, or simply feral enough, to remain in the arctic wastelands outside were just as useful for deterring any prisoners from seeking to escape" puts Krystos's guard stock across the whole surface; and because a body that forms its own ice armor has no reason to avoid the cold end.
- capabilities flight `[0,0]` : art: no wings, and nothing in either source shows it leaving the ground.
- swim `[10,25]` : Authored low. Nothing shows it swimming; the oceans are frozen over, planet: "The oceans froze over and the plants died out, turning a planet of once vibrant blues and greens into a white winter wasteland."
- burrow `[15,30]` : Authored low. Planet: "took to the icy peaks, tunneling into the mountains for shelter and nesting in the ruins of once luxurious estates now fallen into frozen ruin" is a planet-wide statement about Krystians generally, so it justifies only a modest capability, not a species claim; the Yetimoth's own sourced habitat is the prisons.
- climb `[20,35]` : Authored low. An ape body can climb, but nothing in either source shows this one doing it and its mass works against it.
- sprint `[20,35]` : species: "until they could lumber over close enough". Lumbering is the source's own word for how it closes, so the band is deliberately low.
- leap `[15,30]` : Authored low, same mass reasoning as climb.
- manipulation `[45,65]` : species: "their meaty, ice-gauntleted fists" and "blocking off escape routes in walls of frost". Grasping anatomy (`fists`) is present, so an upper bound above 40 is permitted; the band stays mid because fists are blunt hands, not fine manipulators.
- senses sight `[40,60]` : Authored. No source sentence; a mid band, held down because a mammoth-headed body is not drawn with prominent eyes in the art.
- hearing `[55,75]` : art: two large fanned ears set wide on the skull.
- smell `[55,75]` : art: a long trunk, the mammoth's scenting organ, drawn as the dominant facial feature.
- senses.special omitted : no source sentence supports any of the six.

### Archetype weights

- `juggernaut` 5 (strength, resilience) : species: "If their enormous size and strength was not enough to keep prisoners in line" plus "covering themselves in a near-impenetrable armor". Strength and toughness together is the species' whole reading.
- `bulwark` 4 (vitality, resilience) : species: "blocking off escape routes in walls of frost". A body whose job is to be the wall.
- `vanguard` 3 (strength, vitality) : species: "pummel them into submission".
- `stalwart` 2 (resilience, willpower) : species: "the Yetimoths formed the rank and file of Krystos' prisonguards in ancient times". Guard duty is holding a post.
- `survivor` 1 (vitality, endurance) : planet: "hostile Xalians of incredible strength and stamina stood ready to oppose them", describing Krystos's Xalians during the Vallerii assault. Weighted lowest because it rests on a planet-wide sentence about the environment, not a species behavior.

### Attribute bands

- strength `[72,92]` : species: "enormous size and strength" and "pummel them into submission".
- vitality `[65,85]` : species: "Hulking".
- endurance `[60,80]` : species: "the rank and file of Krystos' prisonguards", a body that stands a shift.
- agility `[12,30]` : species: "until they could lumber over close enough". The legacy gauge also rates evasion low.
- reflex `[15,35]` : same source clause; a lumbering closer does not react quickly.
- intelligence `[30,50]` : species: "blocking off escape routes in walls of frost" and "encapsulating their opponents until they could lumber over close enough" show a creature that solves a containment problem before it swings, which is the middle of the animal band and nowhere near true-human range.
- willpower `[55,75]` : species: "the Yetimoths formed the rank and file of Krystos' prisonguards in ancient times", a body engineered to hold a line against dangerous prisoners.
- instinct `[40,60]` : Authored mid. Nothing shows it as a tracker or a predator.
- charisma `[35,55]` : species: "Hulking". Presence from bulk, not from bearing.
- resilience `[70,90]` : species: "covering themselves in a near-impenetrable armor" and "If their enormous size and strength was not enough to keep prisoners in line".

### Trait pool (expected count 3.97)

Arithmetic: the eight non-excluded entries sum to 85 + 80 + 55 + 45 + 25 + 20 + 20 + 15 = 345, giving 3.45. The exclusion pair adds `pack-bonded` at 0.45 plus `solitary` at 0.12 times (1 minus 0.45) = 0.066. Expected count 3.97.

- `armored` 85 : species: "covering themselves in a near-impenetrable armor". Not 100: the covering at rest is fur, not an armored covering, so the trait describes the armored state the body reliably reaches rather than a body-demanded fact. The 15 percent that lack it are Generator variance on the frost-forming aspect.
- `resistant` 80 : planet data block: a temperature low of -122 degrees Celsius, and planet: "the endless cold and hunger that stalked each and every soldier who made landfall on Krystos". This is an environmental adaptation on a world whose cold kills unadapted bodies, which section 5.3 permits a planet-wide sentence to justify. Near-universal, not 100, so individuals differ.
- `menacing` 55 : species: "to keep prisoners in line". A guard whose function is deterrence. Species-sourced behavior, not planet-sourced.
- `anchored` 45 : species: "blocking off escape routes in walls of frost". A body that makes itself the barrier, on a world whose data block gives a gravity of 1.2 times Earth, carried on a 400 kg frame. Not 100: nothing says it cannot be moved, only that it blocks.
- `pack-bonded` 45 : species: "the Yetimoths formed the rank and file of Krystos' prisonguards in ancient times". Rank and file is a body that works in formation with others. Higher partner of the exclusion pair, so it is rolled first.
- `protective` 25 : species: "blocking off escape routes in walls of frost". The instinct reads as containment more than as shielding an ally, so the percent is held low.
- `perceptive` 20 : species: "to keep prisoners in line" and "blocking off escape routes in walls of frost". Watching for an escape is a species-sourced behavior; the percent is modest because no sentence says it finds what hides.
- `ramming` 20 : species: "until they could lumber over close enough to pummel them into submission". Mass arriving with the blow, but the source's own word is lumber, which argues against a charging body, so this stays low.
- `mind-sealed` 15 : species: "the Yetimoths formed the rank and file of Krystos' prisonguards in ancient times", a guard engineered not to be talked around by the empire's most dangerous prisoners. A minority trait, not a species fact.
- `solitary` 12 : planet: "those who were tough enough, or simply feral enough, to remain in the arctic wastelands outside were just as useful for deterring any prisoners from seeking to escape". This describes Krystos's guard stock generally, so it justifies only a minority variant, and it is the lower partner of the exclusion pair.
- Left out with reason: `inspiring` (dropped in the trim below; the rank-and-file sentence supports a body that holds a formation, not one that lifts the others, so it was the weakest entry in the pool); `healing` and `regenerative` (nothing in either source shows repair); `phasing` (corporeal, no ghost reading); `toxic` and `volatile` (its weapons are blunt and cold, never chemical or reactive); `reflective` (the armor absorbs, it does not return); `hypnotic` (nothing entrancing); `foresighted` and `telekinetic` (both rare and both unsupported: the frost forms on its own body and on the ground around it, never lifted and moved); `stealthy` (a hulking body that lumbers, and the registry tilt is against it); `nocturnal` (the planet history never says Krystos is dark, only cold; the debris blotted the sky but the sources do not describe a night-adapted population); `luminous` (nothing sheds light); `slippery` (the opposite of this body).

Trim note: the pool was first authored at an expected count of 5.14 and the script warned that this was above its 3.5 guideline. The trim dropped `inspiring` and lowered every percent below `armored`. The trim is a real improvement in one respect, since `perceptive`, `ramming`, and `mind-sealed` were each supported by an inference rather than a sentence and deserved to sit lower. It is a mild loss in another: the Yetimoth is a heavily specified species whose description names armor, containment, deterrence, and formation work in four consecutive clauses, and a body that genuinely reads as four or five traits is not a fault. The remaining 3.97 is left above the guideline for that reason and is not trimmed further.

### Instruments and conduits

- `fists` : species: "pummel them into submission with their meaty, ice-gauntleted fists". The part the description explicitly fights with. In anatomy.
- `tusks` : species: "tusks made of pure ice"; art: two enormous curved goring teeth, the largest features on the body. In anatomy.
- `hide` : species: "covering themselves in a near-impenetrable armor". The body surface used defensively, which is the registry definition of the hide key. In anatomy.
- conduit `hide: ice` : species: "they could also form thick sheets of ice from thin air, covering themselves in a near-impenetrable armor". The element's power terminates on the body surface itself; this is the element leaving the body through that part, which is the 5.7a predicate.
- conduit `fists: ice` : species: "their meaty, ice-gauntleted fists". The fists are shown carrying ice as the thing that lands, not merely being of an element.
- No conduit on `tusks`: the tusks are made of ice, and section 5.7a rules that being of an element never makes a part a conduit. Nothing shows ice power leaving the body through them.

### Signature ability

- Lore-defining act, quoted: "they could also form thick sheets of ice from thin air, covering themselves in a near-impenetrable armor".
- instrument `hide` : the effect terminates on the Yetimoth's own body surface, per the section 10 rule that the instrument is where the effect lands. It is not the aura channel (nothing emanates outward to act on everything around it) and not the breath channel (nothing is expelled).
- action `ward` : the registry defines ward as protection of the user or an ally by shielding, deflecting, or bracing. The hide row in 5.7 is ward and shove, so the signature needs no matrix exception.
- medium `ice` : the species' primary element, and the substance the description names.
- intensity `[45,85]` : a wide band because "near-impenetrable" is the top of it and a rank-and-file guard is the bulk of it.
- name `Mantle of Unyielding Winter` : coined in the grander register. Collision scan run case-insensitively against all fourteen consolidated element files and the neutral pools: no match. No possessive, no hyphen, American English, no franchise, weapon, or Earth-fauna reference. A prior-ledger search for the species name across all fifteen catalog files returned nothing, so no reserved name exists.
- description : one line, canon voice, states what it does and names no mechanic.

## Authored fields

Values with no supporting source sentence, recorded here because the JSON carries no provenance:

- `diet: omnivore` : registry default for a flesh body with no feeding sentence.
- `communication: ["vocal", "display"]` : no source names a call or a signal. Chosen as the minimum honest set for a large social guard animal; an empty array was the alternative and is defensible. Flagged as the weakest authored value in this template and raised as the open question below.
- `senses.sight [40,60]` : no source sentence.
- `capabilities.swim [10,25]`, `burrow [15,30]`, `climb [20,35]`, `leap [15,30]` : no species sentence for any of the four; all four held low and none exceeds 60, so none requires source support.
- `attributes.instinct [40,60]` : no source sentence; mid band.
- `lore.biomeNiche` : phrased from the planet history's high-security prison complexes on the frozen tundra plus the species sentence naming it a prison guard.

## Thin combos

Counted for each instrument by allowed action by medium, medium being ice (primary) or metal, water, or dark (the on-graph secondaries for ice). Cell sizes read from the consolidated files: ice strike 274, crush 140, rake 174, shove 80, ward 164, hurl 80, terrorize 133; metal strike 113, crush 103, rake 79, shove 32, ward 153, hurl 51, terrorize 97; water strike 78, crush 39, rake 116, shove 153, ward 46, hurl 23, terrorize 40; dark strike 331, crush 129, rake 228, shove 496, ward 98, hurl 44, terrorize 82. Every neutral action pool is 50 names or larger.

- `fists` (strike, crush, shove): smallest cell is water crush at 39, plus the neutral crush pool. No thin combo.
- `tusks` (strike, shove, rake, crush, terrorize): smallest cell is metal shove at 32, plus the neutral shove pool. No thin combo.
- `hide` (ward, shove): smallest cell is metal shove at 32, plus the neutral shove pool. No thin combo.
- No combo falls below 6 drawable names. Instrument tags reduce these counts but nowhere near toward 6 at these cell sizes.

## Script denials

Every FAIL the script raised on any run of this key, with the value I had proposed and what I did about it.

- `md.emdash` (run 1): walkthrough contains an em-dash. Proposed value: the walkthrough used em-dashes as the separator between each judgment and its evidence, 71 of them, in the pattern a list item, then an em-dash, then `species:` and the quote. Script message: `walkthrough contains an em-dash`. Fix: every em-dash in the walkthrough was replaced with a colon, so the pattern is now `- covering fur : species: "..."`. Do I think the original was better? No, and yes in one narrow sense. The ban itself is right and is Nick's standing rule for the project, so the denial is legitimate. But the rule as written in section 3 is a rule for prose voice, and the walkthrough is not prose, it is an evidence table written as a list. The colon separator now collides with the second colon that introduces each source quote, which reads worse than the dash did. Smallest fix, offered under operating rule 7: either the script scopes `md.emdash` to the walkthrough's prose paragraphs and skips list-item separators, or section 3 says explicitly that the walkthrough is covered too and the separator convention is a colon, so the next agent does not author 71 dashes and then convert them.

No other FAIL was ever raised on this key. The remaining three items on the final run are WARNs, answered below.

### WARN answers

- `traits.expected` (expected trait count 3.97 is above 3.5). Answered in the trait pool section above. The pool was cut from 5.14 to 3.97 in response to this warning and is deliberately left slightly above the guideline: the description names armor, containment, deterrence, and formation work in four consecutive clauses, so four expected traits is what the source actually supports. Recorded under operating rule 7 as a case where the guideline and the source pull in opposite directions; no rule change is requested, since the script correctly flagged a pool that was too fat on its first pass.
- `conduits.source` for `hide` and `ice`. Confirmed. The sentence is: "they could also form thick sheets of ice from thin air, covering themselves in a near-impenetrable armor". The element leaves the body and terminates on the body's own surface, which is the 5.7a predicate.
- `conduits.source` for `fists` and `ice`. Confirmed. The sentence is: "pummel them into submission with their meaty, ice-gauntleted fists". The fists are shown carrying the frozen material as the thing that lands, which is the element channeled through that part rather than the part merely being of that element.


## Open questions for Nick

The one value in this template I am least sure of is the communication array. Neither the description nor the artwork gives the Yetimoth a voice, a gesture, or a signal of any kind; every sentence about it is about force, ice, and containment. I authored the vocal and display values on the reasoning that a rank-and-file guard working in formation with other guards has to signal somehow, and that a mammoth-headed ape is a body with an obvious call and an obvious posture. But the registry treats an empty array as fully legal and meaningful, and there is a real reading of this species in which it is silent: a thing that walls you in and lumbers over is more frightening for saying nothing, and the description's own emphasis is on doing rather than communicating. Should the Yetimoth keep the authored vocal and display, or should it be mute with an empty array? My recommendation is to keep them, because the prison-guard role in the description is explicitly a formation role and mute would leave a squad of them with no way to coordinate at all.

## Validator output

```
WARN traits.expected                expected trait count 3.97 is above 3.5; confirm the species is meant to carry that many
WARN conduits.source                conduit hide for ice: the validator agent must confirm the sentence or art showing the element leaving through this part
WARN conduits.source                conduit fists for ice: the validator agent must confirm the sentence or art showing the element leaving through this part

0 FAIL, 3 WARN (structurally clean; every WARN must be answered in the walkthrough)
```

## Orchestrator amendments

- 2026-09-02, after the independent validation and the orchestrator's own look at the art (matched the run's reading: upright ape on two feet, arms hanging free ending in blunt hands, trunk, two outlined tusks, shaggy pelt, nothing plated at rest): no value changed. Caveat recorded on the `fists` ice conduit: "ice-gauntleted" names a state, and the gauntlets are plausibly the same sheet-forming ability that armors the hide; the conduit stands because the fists are the only part that transfers the ice to an opponent ("pummel them into submission with their meaty, ice-gauntleted fists"). `communication` kept at `vocal`, `display` by orchestrator decision: authored, disclosed, and the one behavior value with no sentence behind it; "rank and file" supports group work only. Nick may override to an empty array.
- 2026-09-02, archetype scale (Nick): `archetypeWeights` converted from relative 1 to 5 weights to percents summing to 100 by largest remainder, order preserved: juggernaut 33, bulwark 27, vanguard 20, stalwart 13, survivor 7 (was juggernaut 5, bulwark 4, vanguard 3, stalwart 2, survivor 1).
- 2026-09-02, archetype rethink (Nick): the converted row kept the old 5-4-3-2-1 ladder shape shared by every record, so the distribution was re-authored on this species alone: juggernaut 36, bulwark 34, stalwart 18, vanguard 12 (was juggernaut 33, bulwark 27, vanguard 20, stalwart 13, survivor 7). Reasoning: strength and resilience at the top with a ward signature: juggernaut and bulwark near-equal (the pummeler and the armored wall are the same body), stalwart for the guard's will; survivor dropped as ladder filler.
