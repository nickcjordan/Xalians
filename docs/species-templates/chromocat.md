# Chromocat migration walkthrough

## Art reading

The artwork is a flat black silhouette of a large feline in a low prowl, seen three-quarters on from the front and left. It is one body, not several. The head is broad and cat-like with two long tufted ear points rising from the skull, a shaggy ruff of pointed fur hanging below each cheek, two narrow slit eyes, a small triangular nose, and an open snarling mouth showing an upper and lower pair of long fangs. Four limbs are drawn and all four bear weight: the near forelimb is planted on the ground at lower right with the paw splayed and five curved claws visible, the far forelimb is planted at lower center with its paw and claws also on the ground, and both hindlimbs are gathered under a raised haunch at the left, the near hind paw flat on the ground with claws showing and the far hind paw behind it. No forelimb is raised or held clear; nothing is being grasped or carried. The back arches from the haunch down to the shoulders and the neck drops low so the head is close to the ground, the crouch of a cat about to spring. A long thick tail sweeps up and back from the haunch and curls over, ending in a tufted tip. Two large crescent shapes, drawn in fine parallel striation rather than solid black, sweep back from behind each front paw: a big one behind the far forelimb across the bottom of the image and a smaller one behind the near forelimb at the right. These are the sickle blades: they trail rearward from the front paws and are rendered as radiant striation rather than solid mass. The outline of the body carries pointed tufts at the ears, cheeks, shoulder, and tail tip, so the surface is drawn as fur. No wings, no horns, no shell or plate edges, no crest.

Note that the render is a black silhouette, so the albino coloring the description states is not visible in it; the description settles color and the art settles form.

## Judgments

### Description status

- `descriptionStatus: source`. The species.json description is already one paragraph in the full register: it opens on a body appositive, states the engineered purpose under the Vallerii, and turns to the present day. Word count is 118, inside 60 to 140. It is carried verbatim, so no clause was added and there is nothing to justify.

### Element, planet, generator

- `element: light`, `homePlanet: luminax`, `generatorPlanets: [luminax]`. The species entry gives Light as its type and Luminax as its planet. Legacy species are home-only.
- No `affinityOdds` override: nothing in either source argues this species carries a secondary more or less often than any other. On-graph secondaries for light are fire, electric, psychic.

### Physiology

- `corporeality: corporeal`. species: "the large, albino feline known as the Chromocat possesses two sickle-shaped blades". A body that has paws and is struck at is physical. The photonic state is a temporary shift and, per the registry rule that a transient state produced by an ability never changes composition, covering, or body plan, it does not make the resting body non-corporeal.
- `composition.primary: flesh`, no secondary. species: "albino feline" is living animal tissue. The blades are declared as anatomy, not as a composition secondary: species calls them "infused with pure ionized radiation", which is an emission rather than a substance the body is built of, and the registry rule reserves a secondary for a structural substance such as a skeleton, a core, or horns.
- `bodyPlan: quadruped`. The description names no number of legs, so the art decides, and in the art all four limbs bear weight with both forepaws planted on the ground. The registry selection rule is that a creature whose forelimbs reach the ground as legs is quadruped whatever pose it is drawn in. The description names no forelimb work either, only that the blades "extend backwards from its front paws", which is a part carried on the paw rather than the paw grasping.
- `covering: fur`. The art draws the outline with tufted, pointed edges at the ears, cheeks, shoulder, and tail tip, which is the registry's stated tell for fur, and species: "albino feline" gives a pelt animal. Both sources agree, so this is not a default.
- `anatomy: blades, claws, jaws, fangs, tail, hide`.
  - `blades`, a limb ending in a cutting edge. species: "two sickle-shaped blades infused with pure ionized radiation that extend backwards from its front paws"; art: two striated crescents sweeping back from behind each front paw.
  - `claws`. art: five curved claws visible on the planted near forepaw, claws also on the far forepaw and the near hind paw.
  - `jaws`. art: an open snarling mouth with a full upper and lower bite.
  - `fangs`. art: two long upper and two long lower piercing teeth in the open mouth.
  - `tail`. art: a long thick tail sweeping up from the haunch and curling over, tufted at the tip.
  - `hide`, the unarmored body surface used defensively. The body carries no armored aspect in either source, no shell, plate, or carapace edge anywhere in the art. The two surface keys are exclusive and this is the unarmored one.
  - Sense organs are not anatomy, so the prominent tufted ears and the slit eyes in the art are carried in the `senses` bands and in `communication: display`, not as anatomy keys.
- `size: heightCm [80, 105]`, `weightKg [60, 90]`. The legacy height of 142 cm and weight of 75 kg are a relative gauge only. species: "large, albino feline", and the art's low four-legged prowl puts the honest measurement at shoulder height for a quadruped rather than a standing biped height, so the band is authored below the legacy figure while keeping the mass near it: a big cat of 60 to 90 kg is large among felines, which is what the source claims, and the legacy 75 kg sits inside the band.
- `lifespan: standard`. Rubric cut 3: a flesh body whose weight-band midpoint is 75 kg falls in the 20 kg to 200 kg range, which is `standard`. No adjustment applies, since nothing in the sources calls it cold, slow, or long-lived and it carries no armored covering. Cut 4 does not apply because no source sentence says the environment shortens this species' life.
- `genome.chirality: rolled`. The default; a flesh body has chiral chemistry, so nothing argues for the alternative.
- `diet: carnivore`. The registry selection rule is that a sentence showing the creature consuming or preying settles the value and a sentence showing only fighting does not. Neither source shows this species feeding at all: the harvest sentences show it cutting grain as labor rather than eating it, and the present-day sentence shows only combat. The stated fallback for a flesh body with no feeding sentence is `omnivore`. See Script denials and Authored fields: `carnivore` is authored on the feline body plus the fangs and claws in the art rather than on a sentence, and is flagged as such.
- `communication: vocal, display`. `vocal`: art: the open snarling mouth of a feline, a body that makes calls. `display`: the tufted ear points and the raised ruff are posture and signal features drawn prominently, and the body sheds light, which is the registry's stated posture-or-light-pattern signaling. Neither is a language.
- `breathes: [gas]`; `ambientMedia: [gas, vacuum]`. Gas is an air-breathing land animal on a terrestrial world. Vacuum rests on the planet history: "Being well adapted to the immense radiation present on their planet, Xalians from Luminax were a natural choice of labor for the design of the Stellaris Superstructure." and "their immunity to the cosmic radiation proving necessary for the construction and maintenance of the Dyson Sphere." This is a planet-wide statement about Luminax Xalians and is used only for an environmental tolerance, which the rules permit, and never for a trait weight or a behavior. `breathes` remains a subset of `ambientMedia`.
- `temperatureC: min 25, max 95`. The Luminax data block gives a Temperature Low of 24.5 C and a Temperature High of 122 C, so the band lies inside the planet range. It is narrowed at the top because the fields this species works are the vegetated sunward face rather than the hottest solar-farm extremes; the low end sits near the planet floor because the species has no cold adaptation in either source.
- Capabilities. `sprint [80, 98]`: species: "Today, their wicked speed and ionic blades allow them to seemingly 'teleport' around the battlefield", and the legacy speed rating is the top value that gauge offers. `leap [70, 92]`: species: "their ability to enter a photonic-state and leap through fields at the speed of light". `climb [45, 70]`: a clawed feline body in the art; the upper bound is justified by the claws on every planted paw. `swim [10, 30]`: no source; a land quadruped that crosses water badly. `burrow [0, 5]`: no source; nothing in the body digs. `flight [0, 0]`: no wings in the art and the legacy flight flag is false. `manipulation [20, 45]`: `claws` is grasping anatomy so an upper bound above 40 is permitted, but nothing in either source shows the paws handling objects, so the band stays just over the line.
- Senses. `sight [70, 92]`: a light-element hunter with two forward-set eyes in the art, working in the daylight hemisphere of a tidally locked world; planet: "half of the world is rendered in eternal daylight, the other in perpetual night." `hearing [55, 80]`: art: two large tufted ear points drawn as the tallest features of the head. `smell [45, 70]`: no source; an ordinary animal band. No `special` sense, since neither source shows one and the rule is to omit rather than pad.

### Instruments and conduits

- `instruments: blades, claws`. Both are in anatomy. `blades` is the part the description fights and works with: species: "harassing their opponents by barraging them with rapid cuts in a slice-and-dice pattern so swift that reaction becomes nearly impossible." `claws` is the second working part, visible on every planted paw in the art. Only two are declared because the description gives no third fighting part; the jaws and fangs are present in the art but the description never uses them.
- `conduits: blades to light`. The predicate is that the sources show the element's power leaving the body through that part, and species states it directly: "two sickle-shaped blades infused with pure ionized radiation". The blades are where this species' light is expressed. `claws` is not declared a conduit, since no source shows light leaving through them.

### Archetype weights

The row is one dominant nature with a short tail, because the description reads overwhelmingly as one thing: a fast, evasive cutter. `skirmisher: 52`, favoring agility and reflex, from species: "so swift that reaction becomes nearly impossible" and "their wicked speed and ionic blades allow them to seemingly 'teleport' around the battlefield". `prowler: 24`, agility and instinct, for the crouched stalking posture the art draws. `predator: 18`, instinct and reflex, for the fanged, clawed hunting body in the art. `runner: 6`, agility and endurance, for the field-crossing work in species: "they could comb through and harvest entire fields in record time". The four sum to 100 and nothing below 5 is listed. The strength and charisma archetypes are absent because nothing in either source reads as bulk, mass, or presence.

### Attribute bands

- `agility [78, 97]` and `reflex [74, 95]`: species: "so swift that reaction becomes nearly impossible"; the legacy speed rating is the gauge's top value.
- `resilience [22, 42]` and `vitality [35, 58]`: the legacy standard-defense rating is the gauge's low value, and the body in the art is a lean unarmored cat.
- `strength [40, 62]`: a large feline that cuts rather than overpowers; the work the source describes is cutting grain, not hauling.
- `endurance [40, 65]`: species: "comb through and harvest entire fields in record time" is sustained field work, but the same sentence frames the achievement as speed rather than stamina.
- `instinct [58, 80]`: the hunting posture and forward-set eyes in the art.
- `intelligence [30, 52]`: an animal that comprehends instruction and worked as harvest labor, well under true-human range.
- `willpower [35, 58]` and `charisma [30, 55]`: neither source addresses mind or presence, so both sit in a plain middle band. Flagged in Authored fields.

### Trait pool

Expected trait count, with the exclusion pair counted as `solitary` at 30 rolling first and `pack-bonded` at 15 times one minus 0.30, which is 10.5: (100 + 90 + 55 + 30 + 28 + 20 + 10.5 + 8 + 5) divided by 100, which is 3.47.

- `luminous: 100`. Body-demanded. species: "two sickle-shaped blades infused with pure ionized radiation" and "their ability to enter a photonic-state": a body that carries radiating blades and turns to light sheds light. Universal, and so exempt from tilts.
- `resistant: 90`. Environment-demanded, and the rules permit a planet-wide sentence to justify an environmental adaptation. planet: "Being well adapted to the immense radiation present on their planet, Xalians from Luminax were a natural choice of labor for the design of the Stellaris Superstructure." Held below 100 because the same history records that the ION-9 misfires are still mutating the Luminarii, so the adaptation is not absolute.
- `slippery: 55`. species: "allow them to seemingly 'teleport' around the battlefield" describes a body that cannot be pinned down. Below 100 because the sentence describes movement rather than an established guarantee against grabs, and because individuals should differ.
- `stealthy: 28`. Art evidence rather than planet evidence: the low crouch with the neck dropped and the head near the ground is a stalking approach. Kept well under half because the fighting style the description names is open harassment, not concealment.
- `solitary: 30` and `pack-bonded: 15`. The sources point weakly both ways: species uses the plural throughout for the harvest work, "they could comb through and harvest entire fields in record time", which is a body of workers, while the present-day sentence describes a single creature harassing opponents. Both are in the pool, the higher rolls first, and neither is near 100.
- `perceptive: 20`. Art: the two large tufted ears and the forward-set eyes. Deliberately not justified from the planet's light or dark hemispheres, since a planet-wide sentence may never justify a behavior.
- `volatile: 8`. species: "infused with pure ionized radiation" on parts of the body makes striking it occasionally hazardous. Low, because no source shows a reaction to being hit.
- `foresighted: 5`. Rare band, justified only as far as species: "so swift that reaction becomes nearly impossible" reads as acting ahead of the moment. Single digits per the rarity rule.
- Considered and left out: `armored`, since there is no armored covering and the body carries the unarmored surface key; `nocturnal`, since the fields this species worked are on the sunward face in eternal daylight, so night adaptation would contradict the source, and the dark side is planet-wide context that could not justify a trait here in any case; `ramming`, since nothing in the sources shows it hitting with its body; `phasing`, since the photonic state is a transient ability state and the registry rule is that a transient state is an ability rather than a change to the body, and treating it as `phasing` would also brush the no-teleportation constraint; `telekinetic`, `healing`, `protective`, `mind-sealed`, `hypnotic`, `menacing`, `inspiring`, `toxic`, `reflective`, `regenerative`, and `anchored`, none of which has support in either source, with `anchored` contradicted outright by the mobility the description is built on.

### Signature ability

- The lore-defining act, quoted: species: "their ability to enter a photonic-state and leap through fields at the speed of light meant they could comb through and harvest entire fields in record time", together with "their wicked speed and ionic blades allow them to seemingly 'teleport' around the battlefield, harassing their opponents by barraging them with rapid cuts". The single act is the closing at light speed that ends in a cut.
- `instrument: blades`. The effect terminates on the target at the blades: the cut is what the opponent receives. The photonic state is the physics that produces the closing speed, and per the ratified pilot lesson the instrument is where the effect terminates rather than the physics that drives it.
- `action: ambush`. The registry defines it as a burst of closing speed that ends in a hit, which is exactly the described act. `ambush` is not in the physical row for `blades`, which is strike, rake, lash, and the `light` conduit row is beam, burst, ward, mend, terrorize, spray, which does not carry it either. See Script denials: this is taken under signature rule 4, which allows a signature outside the matrix so long as it uses registry vocabulary.
- `medium: light`. The primary element, and the blades are literally the element: species: "infused with pure ionized radiation".
- `intensity: [45, 88]`. A wide band because the described effect is a barrage whose result varies with how many cuts land: species: "barraging them with rapid cuts in a slice-and-dice pattern".
- `name: Harvest at the Speed of Light`. Grander register, exempt from the two-word limit. The collision scan was run case-insensitively across all fourteen consolidated element catalogs and the neutral pools, with no match. No catalog ledger note reserves a signature for this species: a case-insensitive search for the species name across the same fifteen files returned nothing. The name takes the description's own two halves, the harvest work and the light-speed movement, and joins them.
- Signature description: one line, present tense, no mechanics named, ending on a plain fact about what the cuts do.

## Authored fields

Values with no supporting source sentence, listed so they are on the record as judgments:

- `diet: carnivore`. There is no feeding sentence anywhere; the registry fallback would be `omnivore`, and this is authored from the fangs and claws in the art instead. See Script denials.
- `lore.biomeNiche`. Assembled from the planet history's fields and sunward face rather than quoted from one sentence.
- `size.heightCm` and `size.weightKg`. Proposed absolutes; the legacy figures are a relative gauge only.
- `capabilities.swim`, `capabilities.burrow`, `capabilities.climb`. No source sentence; ordinary bands for a clawed land quadruped.
- `capabilities.manipulation`. Grasping anatomy permits the upper bound; no source shows handling.
- `senses.smell`. No source.
- `attributes.willpower`, `attributes.charisma`, `attributes.intelligence`. No source addresses any of the three; middle bands.
- `signatureAbility.intensity` bounds. The spread is reasoned from the barrage; the numbers are authored.
- `environmentalTolerance.temperatureC` bounds. Inside the planet range; the specific narrowing at the top is judgment.

## Thin-combo findings

Counted as drawable names for this species, meaning untagged names in the element cell, plus names tagged with an instrument this species carries, which is `claws`, plus the neutral pool for that action. This species draws no `blades`-tagged names because no catalog file uses a blades tag at all; the instrument tags present across the light catalog are light-organs, gaze, aura, claws, vents, voice, and tendrils.

The instruments are `blades`, with actions strike, rake, lash, and `claws`, with actions strike, rake, crush, shove, ambush. The media are the primary light plus the on-graph secondaries fire, electric, and psychic. Neutral pool sizes: strike 87, rake 57, lash 54, crush 53, shove 83, ambush 82.

- light: strike 235 untagged plus 3 claws-tagged, rake 172 plus 13, lash 192 plus 2, ambush 45, crush 18, shove 155. No combo under 6.
- fire: rake has only 3 untagged names, but 62 are claws-tagged and this species carries claws, so the claws-rake-fire combo draws 65 from the cell plus the 57-name neutral pool. The blades-rake-fire combo draws only the 3 untagged names from the cell, clearing 6 on the neutral pool alone. fire lash has 0 untagged names and 5 claws-tagged, so blades-lash-fire draws nothing at all from the element cell and rests entirely on the 54-name neutral pool. Reportable as thin at the element layer: the fire lash cell is effectively claws-only.
- electric: rake has 4 untagged plus 15 claws-tagged; lash has 15 untagged plus 6 claws-tagged. The blades-rake-electric combo draws 4 from the cell plus the neutral pool. Thin at the element layer.
- psychic: rake 12 untagged, lash 35, strike 80, ambush 34. No combo under 6.

Nothing was padded. The two findings are blades-lash-fire, with no element-layer names, and blades-rake-electric, with four.

## Answers to every script WARN

- `traits.expected`. The first run reported an expected count of 3.87, above the 3.5 line. I retuned the four weakest-evidence entries down, `slippery` from 62 to 55, `stealthy` from 40 to 28, `perceptive` from 30 to 20, `volatile` from 12 to 8, and the exclusion pair from 35 and 20 to 30 and 15, giving 3.47. The two entries at or near 100 are body-demanded and environment-demanded and were not touched.
- `conduits.source`. The sentence the validator agent should confirm is species: "two sickle-shaped blades infused with pure ionized radiation that extend backwards from its front paws". The blades are stated to be made of the element's own radiation, so the element leaves the body through them by definition, and the art draws them as radiant striation rather than solid mass.
- `signature.action.matrix`. Answered in full under Script denials: this is a deliberate signature rule 4 exception, kept because the described act is the closing rather than the cut.
- `signature.description.elementkey` and `enc.definition.elementkey`. Both flag the word light. In both places it appears only inside the ordinary English phrase for the speed of light, which is the source's own wording: species: "leap through fields at the speed of light". It is never used as a type label, and no registry word appears in either piece of prose.

## Script denials

- `signature.action` outside the instrument matrix. Original and final value: `ambush` on instrument `blades`. The script raises this as a warning rather than a failure, because `ambush` sits neither in the physical blades row, which is strike, rake, lash, nor in the light conduit row, which is beam, burst, ward, mend, terrorize, spray. I kept it and took signature rule 4 deliberately rather than downgrading the act to `rake`, because the act the description names is specifically the closing, not the cut: species: "seemingly 'teleport' around the battlefield", and `ambush` is the registry's own word for a burst of closing speed that ends in a hit. Downgrading to `rake` would lose the entire distinguishing half of this species. The smallest fix at the rule level, if this friction should be removed rather than handled per species, is to add `ambush` to the light conduit row in section 5.7a, or to add `ambush` to the physical blades row, since a bladed limb that closes and cuts is the ordinary case for that part.
- `diet` fallback. The registry's stated fallback for a flesh body with no feeding sentence is `omnivore`. I wrote `carnivore` instead, on the art alone: two upper and two lower fangs, and claws on every paw. I believe `carnivore` is the better value for this body, and I have flagged it in Authored fields rather than hiding it. If the rule is meant to be absolute, the value should be `omnivore`, and the smallest fix is to state in the diet selection rule that dentition visible in the art may settle the value where no sentence exists.

## Open questions for Nick

The description says the Chromocat can seemingly `teleport` around the battlefield, and the canon constraints ban teleportation outright while also saying the source description overrides this skill wherever the two conflict. I read the single quotes in the source as the historian's own hedge, meaning it moves so fast that the movement looks instantaneous, and I built the signature as a closing burst rather than as instant relocation. Does that reading hold, or would you rather the photonic state be treated as a genuine exception granted to this species through its signature?

## Validator output

```
WARN conduits.source                conduit blades for light: the validator agent must confirm the sentence or art showing the element leaving through this part
WARN signature.action.matrix        signature action "ambush" is outside the physical row for blades [strike, rake, lash] and outside the light medium row (rule 4 exception; justify)
WARN signature.description.elementkey signature description uses element key word(s) as plain words: light (allowed only as ordinary English, never as a type label)
WARN enc.definition.elementkey      encyclopedia definition uses element key word(s) as plain words: light (allowed only as ordinary English, never as a type label)

0 FAIL, 4 WARN (structurally clean; every WARN must be answered in the walkthrough)
```

No run of the script has ever raised a FAIL on this key. The two entries in the Script denials section above are recorded because they are places where I chose against a stated rule or default, not because the script rejected a value.

## Orchestrator amendments

- 2026-09-02, after the independent validation and the orchestrator's own look at the art: signature action changed from `ambush` (outside both the blades row and the light medium row, taken under the rule 4 exception) to `rake`, which is in the blades row: the source's defining act is the barrage of rapid cuts, and the closing speed lives in the agility band and the skirmisher archetype. The 'opening a dozen wounds before the first is felt' clause was a flourish; rewritten. `diet` falls to the fallback `omnivore` (the run departed to carnivore on the art's dentition alone; no feeding sentence). `vacuum` removed from ambientMedia (the planet sentence is about radiation immunity for Luminarii as a class). The 'teleport' reading stands as the run recommended: apparent instantaneous movement from speed, not relocation. Art matched the run's reading.
