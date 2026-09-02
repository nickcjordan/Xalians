---
name: migrate-species
description: Migrate one Xalian species from its legacy species.json entry to a ratified species template (Stage 3 of the creature-system redesign), self-contained with every registry, enum, canon constraint, verification step, and output contract inlined so an independent agent can run it without reading other files. Use for each of the 29 legacy species and for authoring new species.
---

# Migrate Species (Stage 3): self-contained runbook

One species in, one ratified species template out, plus its Encyclopedia entry. This file is deliberately complete: every registry and rule you need is inlined below. Do not go looking for the design doc or catalog rules; if something here conflicts with an older document, this file wins (it was consolidated from the ratified design doc, the anatomy registry, the ability catalog rulings, and Nick's process rulings on 2026-09-01). The single exception is source canon: the species description in `species.json` and the planet history in `planets.json` are the facts you derive from, and this file never overrides them.

## 0. Operating rules (read first)

1. **Location.** All work happens in the repo worktree `C:\dev\src\xalians-catalog` (branch `data/ability-catalog`). Read inputs from `C:\dev\src\Xalians\lambda\src\json\` (the main checkout, read-only). Write outputs only to `C:\dev\src\xalians-catalog\docs\species-templates\`. Never write anywhere else, never write into any plans folder, never run git commands (Fable commits).
2. **Source-only rule (Nick, 2026-09-01).** Every factual claim about the species comes from the ORIGINAL text of `species.json` (its `description`) and, for planet context, the relevant `history` array in `planets.json`. You must NOT read or rely on summaries: not `CLAUDE.md`, not `canon.md`, not `voice.md`, not any design doc, not any prior template, not any prior record of this species, not memory. Summary-derived scope and causation claims contaminated earlier work and were caught only by source reads. Quote the source sentence that supports each judgment in your walkthrough. Quotations are copy-pasted verbatim (the validator checks each one character for character); if you paraphrase, do not use quotation marks, and never cite a planet-wide statement as if it were about this species.
3. **Fresh derivation.** Do not read `docs/design/sample-record-graviclaw.json`, any existing `docs/species-templates/*` file for the species you are migrating, or any prior migration notes for it. The migration is a derivation from source, not a copy.
4. **Labor.** The agent running this skill authors the template and prose itself, in its own turn. Never delegate to a subagent or background task. An independent validator pass (section 9) is run afterward by the orchestrator, not by you.
5. **Prose voice.** Any in-universe prose you write (the upgraded description, the signature description, the Encyclopedia entry) follows the voice rules in section 3. No em-dashes anywhere. American English.
6. **Numbers are not sacred inputs.** The species' legacy `statRatings`, `height`, `weight`, and legacy `traits` block are a RELATIVE gauge between species, never values to copy. Only the description is a fixed input. You propose realistic absolutes and bands.

## 1. Inputs

- `C:\dev\src\Xalians\lambda\src\json\species.json`: find the species entry: `{ name, id, type, planet, height, weight, description, statRatings, traits }`. `description` is the fixed input. `type` is the primary element. `planet` is the home planet.
- `C:\dev\src\Xalians\lambda\src\json\planets.json`: the home planet's `history` array (long-form prose). Read it in full for environment, industry, and present-day context. Read it with node, e.g. `node -e "const p=require('C:/dev/src/Xalians/lambda/src/json/planets.json');p.find(x=>x.name==='Grimedes').history.forEach(h=>console.log(h+'\n'))"`.
- The ability-name catalog: `C:\dev\src\xalians-catalog\docs\ability-catalog\consolidated-<element>.md` for the species' primary element and each on-graph secondary (section 5.4), plus `neutral-pools.md` in the same folder. Cell format: lines `**<action> (N):** Name · Name [instrument tag] · Name (dual: element) · ...`. Names in `[tags]` are restricted to species whose anatomy includes one of the listed keys or channels.
- Nothing else.

## 2. Canon constraints (hard, never announce them in prose)

- **Xalians are sexless.** No mates, offspring, parents, breeding, lineage, or gendered pronouns. Pronoun is "it". Every Xalian is printed by a Generator. Packs, guardianship, and twin generations from one Scrambler Token are fine.
- **No Xalian speaks a language.** They comprehend instruction because a purpose-built labor force was engineered to understand orders. Communication is calls, cries, signals (percussion, posture, light patterns), or telepathic feeling. Never words. `vocal` means calls and cries. Intelligence spans octopus to near-human; no species bands intelligence into true human range.
- **Lifespan is wear-out, not aging.** Bodies are engineered chassis with a service life. Never write years. Non-corporeal bodies do not wear out.
- **No reality-breaking powers:** no teleportation (nothing in Xalia moves matter instantly; only information via the QED), no true invisibility (that is the top of `stealthy`), no puppeting or possession of another body (`hypnotic` caps at entrancing), no time reversal (perceptual and local time effects only), no creating life or summoning (only Generators create life; a swarm's units are extensions of one body), no permanent transformation (temporary shifts revert; never into another creature). Bounded look-alikes live in traits and abilities; a species that truly warrants an exception gets it only as its hand-authored signature.
- **No spellcasting.** Every projected power decomposes into a channel or emitter: willed = `mind`, radiated = `aura`, expelled = `breath` or `secretion`, emitted = `crest`, `light-organs`, or `core`, discharged = `body`.
- **Scrambler Tokens are physical chips.** Generation vocabulary is generate/generated/origin, never mint or any crypto framing.
- **Nuclear-age military register is out of voice** (the Vallerii idiom is industrial and corporate).

## 3. Voice rules for any prose you write

Galactic historian, third person, formal, cold sardonic edge reserved for Vallerii greed. Science first, then the body count. The horror is economic: name the incentive. Cruelty stated flatly. The Generator has agency but is never confirmed sentient. Hedge the deep past (rumor has it, records were sealed). No hopeful resolution. No modern idiom, no internet register, no game mechanics in prose (no HP, damage, stats, turns). No em-dashes. American English.

- **Species description register** (60 to 140 words, one paragraph, present tense): opens with an appositive describing the body, then the original engineered purpose under the Vallerii, then how that purpose has curdled or been repurposed in the present day, anchored to a specific named location, industry, event, or institution on its home planet. Combat-legible without naming mechanics. Legacy two-sentence stubs get upgraded to this register during migration; the upgrade must not add facts the source and the planet history do not support, only expand what they say.
- **Signature description**: one line, canon voice, what the creature does, never what it rolls.
- **Encyclopedia entry register**: one or two sentences, encyclopedic and definitional, leading with the category noun, cross-referencing canon terms by name (the home planet, named places and institutions), no flourish, no ellipsis. Never name the element key or any registry word in prose (no "dark-element", no "anchored"); describe the body and the act instead.

## 4. The species template contract (what you produce)

Write `docs/species-templates/<key>.json` in exactly this shape. Every field listed is required unless marked optional; optional fields are omitted when not applicable, never null. Graded values are 0 to 100 everywhere; temperatures are Celsius measurements; intensity is 1 to 100.

```jsonc
{
  "key": "<species-key>",                  // lowercase species key
  "name": "<Species Name>",
  "element": "<element>",                   // primary; one of the 14
  "homePlanet": "<planet>",                  // lowercase
  "generatorPlanets": ["<planet>"],          // home-only for legacy species
  "lore": {
    "description": "...",                   // source text if already in full register; upgraded prose if it was a stub
    "descriptionStatus": "source" | "upgraded",
    "biomeNiche": "..."                     // one phrase, sourced from the planet history
  },
  "physiology": {
    "corporeality": "corporeal" | "non-corporeal",
    "composition": { "primary": "...", "secondary": "..." },   // secondary optional
    "bodyPlan": "...",
    "anatomy": ["..."],                     // species-fixed, from the 34-key registry, external functional parts only
    "covering": "...",
    "size": { "heightCm": [lo, hi], "weightKg": [lo, hi] },
    "lifespan": "...",                      // species-set enum, never rolled
    "genome": { "chirality": "rolled" | "achiral" },   // "rolled" = 50/50 levo/dextro per individual; "achiral" only species-declared
    "diet": "...",
    "communication": ["..."],               // [] is legal and means mute
    "breathes": ["..."],                    // [] is legal and means non-breather
    "environmentalTolerance": { "ambientMedia": ["..."], "temperatureC": { "min": n, "max": n } },
    "capabilities": { "flight": [lo,hi], "swim": [lo,hi], "burrow": [lo,hi], "climb": [lo,hi], "sprint": [lo,hi], "leap": [lo,hi], "manipulation": [lo,hi] },
    "senses": { "sight": [lo,hi], "hearing": [lo,hi], "smell": [lo,hi], "special": ["..."] }   // special optional
  },
  "archetypeWeights": { "<archetype>": 5, "<archetype>": 3, "<archetype>": 1 },   // subset of the 16, weights are relative
  "attributes": { "strength": [lo,hi], "vitality": [lo,hi], "endurance": [lo,hi], "agility": [lo,hi], "reflex": [lo,hi], "intelligence": [lo,hi], "willpower": [lo,hi], "instinct": [lo,hi], "charisma": [lo,hi], "resilience": [lo,hi] },
  "affinityOdds": { "none": 0.75, "secondary": 0.25 },   // OPTIONAL; omit to inherit the 75/25 baseline; declare only as a lore-justified override
  "traits": {
    "guaranteed": ["..."],
    "rolledCount": [lo, hi],
    "pool": { "traitKey": weight }
  },
  "instruments": ["..."],                   // 1 to 3; physical ones must appear in anatomy; channels must satisfy their predicate
  "signatureAbility": {
    "name": "...",                          // grander register, exempt from the 2-word limit, collision-checked against the full catalog
    "instrument": "...", "action": "...", "medium": "...",
    "intensity": [lo, hi],
    "description": "..."
  }
  // no appearance block unless deliberately overriding the global finish odds: "appearanceOdds": { "prismatic": 0.005 }
}
```

Constraints the template must satisfy: all keys and enum values are lowercase (`"grimedes"`, never `"Grimedes"`); `breathes` is a subset of `environmentalTolerance.ambientMedia`; `guaranteed.length + rolledCount[1] <= 3` and `guaranteed.length + rolledCount[0] >= 1`; every key in `traits.pool` and `traits.guaranteed` is one of the 24 trait keys; no exclusion pair can co-occur (a guaranteed trait excludes its partner from the pool); `archetypeWeights` keys are from the 16-archetype roster; `manipulation` band upper bound above 40 only when grasping anatomy or `telekinetic` is guaranteed; every physical instrument is in `anatomy`; the signature's action is any of the 16 actions and its medium is the primary element or an on-graph secondary.

## 5. Registries (inlined, ratified)

### 5.1 Attributes (10, frozen)

`strength` (physical force), `vitality` (life force), `endurance` (sustained output), `agility` (speed and maneuvering), `reflex` (reaction time), `intelligence` (brain power; never true-human range), `willpower` (mental fortitude), `instinct` (perception and gut sense), `charisma` (presence, not eloquence), `resilience` (physical toughness). Near-pairs are deliberate: vitality vs resilience (big HP but squishy vs small HP but armored), intelligence vs instinct (clever vs perfect predator).

### 5.2 Archetypes (16; each shaped one favors exactly two attributes)

`vanguard` (strength, vitality) · `juggernaut` (strength, resilience) · `berserker` (strength, endurance) · `bulwark` (vitality, resilience) · `survivor` (vitality, endurance) · `stalwart` (resilience, willpower) · `skirmisher` (agility, reflex) · `runner` (agility, endurance) · `prowler` (agility, instinct) · `predator` (instinct, reflex) · `seeker` (instinct, intelligence) · `sage` (intelligence, willpower) · `virtuoso` (intelligence, charisma) · `sovereign` (charisma, willpower) · `rogue` (charisma, reflex) · `balanced` (favors nothing; stores `favors: []`). Favored-only skew: favored attributes roll toward band tops; nothing is suppressed. Choose a weighted subset that reads true to the body and the description.

### 5.3 Traits (24 keys; mode; exclusions; tilts)

Traits are descriptive facts, never rules text; no negative traits; anatomy gates abilities, traits only amplify. Final keys (the role-noun renames are already applied here; never use healer, guardian, pack-hunter, lone-stalker, charger, venomous, ambusher, mesmeric, keen-sensed, iron-willed, enduring, colossal, linked, conduit, skittish, or any planet-named draft key):

| Key | Mode | Nature |
|---|---|---|
| `healing` | passive | restores others; element colors how; flavor never restricts targets |
| `protective` | passive | instinct to shield and protect others |
| `regenerative` | passive | rapid self-repair, organic or mechanical |
| `armored` | passive | natural plating, shell, or integrated chassis |
| `anchored` | passive | cannot be moved against its will |
| `phasing` | passive | some physical interactions pass through it; auto-granted to non-corporeal bodies, rare roll on corporeal ones |
| `resistant` | passive | shrugs off contamination: toxins, disease, radiation, corrosion, hostile atmospheres (bodily only) |
| `ramming` | passive | a living ram; blows land far harder with movement behind them |
| `toxic` | passive | natural weapons deliver debilitating agents; element colors which |
| `volatile` | reactive | hazardous to strike; reacts when hit, element-colored |
| `reflective` | reactive | energy directed at it returns to its source |
| `menacing` | passive | its presence erodes courage |
| `hypnotic` | passive | entrances and holds attention, dulling the will to act (caps there) |
| `perceptive` | passive | perceives what hides; the counter to stealthy |
| `foresighted` | passive, rare | reads moments before they happen |
| `mind-sealed` | passive | nothing enters, sways, or breaks its mind; counters hypnotic and menacing |
| `pack-bonded` | passive | stronger coordinating with others (excludes solitary) |
| `solitary` | passive | stronger operating alone (excludes pack-bonded) |
| `stealthy` | passive | moves unseen and unheard until it acts |
| `nocturnal` | passive | night-adapted senses and habits |
| `inspiring` | passive | its presence bolsters allies |
| `slippery` | passive | cannot be held: escapes grabs, pins, traps, snares |
| `luminous` | passive | its body sheds light; strips darkness and shadow concealment nearby |
| `telekinetic` | passive, rare | moves things without touching them; levitation is constant, flinging is the derived ability |

Rules: `guaranteed` = traits the body demands (a shelled or plated body means `armored`; a tree that grips the ground means `anchored`; a non-corporeal body means `phasing`); the rolled pool is strictly additive so a rare roll always has MORE than the baseline. Per-creature total 1 to 3. Every pool weight must be justified against physiology or the description in the walkthrough. Registry tilts (stealthy down with mass, anchored/armored/menacing up with mass or size, ramming up with sprint, perceptive up with senses, telekinetic up with manipulation, resistant up with resilience, mind-sealed up with willpower, foresighted up with instinct, hypnotic/inspiring/pack-bonded up with charisma, solitary down with charisma, slippery up with agility, regenerative up with vitality, phasing up with ghost affinity on corporeal bodies) apply at generation automatically; do not re-declare them per species.

### 5.4 Elements (14), mechanical fantasy, and the adjacency graph

| Element | Planet | Mechanical fantasy | On-graph secondaries |
|---|---|---|---|
| fire | Magmuth | heat and relentless aggression | rock, chemical, metal |
| water | Poseidas | flow and restoration | ice, plant, chemical |
| dark | Grimedes | gravity, void, and time (never spooky) | ghost, psychic, ice |
| light | Luminax | radiance and precision energy | fire, electric, psychic |
| plant | Floria | growth and territory | water, chemical, psychic |
| electric | Zolton | storm and surge, chain and link | light, air, metal |
| ghost | Phantiri | incorporeality and dread | dark, psychic |
| rock | Stonera | permanence and immovability | metal, sand, fire |
| chemical | Drainov | reaction and corrosion | fire, metal, water |
| air | Saiphus | wind and freedom | electric, water, ice |
| psychic | Telypso | mind and perception | ghost, light, dark |
| ice | Krystos | stasis and preservation | metal, water, dark |
| metal | Veridium | machinery and precision | electric, fire, ghost |
| sand | Endessa | erosion and attrition | water, rock, ghost |

Primary is fixed by species and stored at affinity 100. Secondaries are graded 1 to 99, always from the graph, never off-graph (the anomaly concept is scrapped; never write `anomalous`). Baseline odds 75% none / 25% one secondary; templates inherit unless they declare a lore-justified override. An ability's medium must be the primary or a rolled secondary.

### 5.5 Physiology enums

- `corporeality`: `corporeal | non-corporeal`
- `composition` primary/secondary: `flesh | plant | mineral | metal | slime | gas | energy | spectral`
- `bodyPlan`: `biped | quadruped | multiped | serpentine | avian | piscine | amorphous | swarm | floating`
- `covering`: `fur | feathers | scales | chitin | hide | plating | crystal | mist | bare`
- `diet`: `carnivore | herbivore | omnivore | photosynthetic | energy-feeder | none`
- `communication` (array): `vocal | vibration | display | chemical | telepathic`; `[]` = mute
- `breathes` (array of phases): `gas | liquid | vacuum`; `[]` = non-breather
- `environmentalTolerance.ambientMedia` (array of phases): `gas | liquid | vacuum`; chemistry is the element matrix's job, not a medium; solid is not a medium (living in rock or sand is the `burrow` capability); pressure, humidity, and atmosphere chemistry are "not modeled", never "unlimited"
- `senses.special`: `echolocation | tremorsense | electroreception | psychic | heat-sense | void-sense`
- `lifespan`: `fleeting | short | standard | long | enduring | ageless`. Wear rubric: body mass and metabolic intensity (hard-working bodies wear faster; cold, slow, armored bodies wear slowest), composition (mineral, metal, crystal outlast flesh; spectral and energy bodies are `ageless`), home-world harshness (field machinery degrades faster). `ageless` is still killable.
- `capabilities` (7, each a 0 to 100 band): `flight, swim, burrow, climb, sprint, leap, manipulation`. Manipulation is outcome-based (how well it handles objects); the means is derivable from anatomy plus `telekinetic`.
- Size: realistic absolutes in cm and kg with deliberately dramatic spread across species. Method: start from a comparable real animal at the stated height, then adjust for composition and covering (chitin, plating, shell, mineral, and metal add substantial mass; gas, mist, and spectral bodies weigh little), then check the result against the description's own claims (an immovable creature is heavy; a flier is light). The legacy height is a fair anchor; the legacy weight is only a relative gauge between species and is never a target to band around.
- Temperature: a sustained-normal-activity band in Celsius, read from the planet history's climate.

### 5.6 Anatomy registry (34 keys) and innate channels (7)

Keys are functional, never material (a stone golem's fists are `fists`; composition carries stone). Parts, not effects. External functional parts relevant to action only; never internal organs. Anatomy is species-fixed.

Head and mouth: `jaws` (full biting mechanism incl. mandibles) · `fangs` (piercing or venom teeth) · `beak` · `tusks` (external goring teeth) · `horns` (permanent cranial spikes incl. drill-horns) · `antlers` (branched rack) · `trunk` (muscular flexible snout) · `tongue` (projectile, sticky, or lashing) · `crest` (emissive or display head-growth) · `lure` (dangled bait appendage).
Limbs: `claws` (hooking or raking digits) · `talons` (raptorial grip-and-pierce) · `fists` (blunt striking hands) · `hooves` · `pincers` (opposing grip; a crab's, scorpion's, or lobster's claws that snap shut are `pincers`, never `claws`, whatever word the description uses) · `blades` (limb ending in a cutting edge) · `spurs` (limb spikes) · `wings` (strike, gust, shroud as well as flight).
Tail and trunk-body: `tail` · `stinger` (venom-injecting spike) · `rattle` (sound-warning tail organ) · `coils` (serpentine wrap-and-crush body).
Surface and armor: `hide` (body surface used defensively) · `shell` (rigid enclosing casing permitting withdrawal) · `spines` (rigid projections: quills, barbs, thorns, crystal growths).
Reach and grasp: `tendrils` (tentacles, vines, streamers) · `roots` (ground-anchored gripping or erupting structures) · `pseudopods` (temporary limbs coalesced from a formless body).
Emission structures: `spinnerets` · `light-organs` · `vents` (pressurized discharge openings) · `core` (exposed radiant or crystal focal mass).
Sensory-dual: `antennae`. Catch-all: `body` (whole-body mass as instrument; universal fallback).

Innate channels (non-physical instruments) and the predicate each must satisfy in the template: `mind` (psychic element, a `psychic` special sense, or `telekinetic`/`hypnotic` in guaranteed traits) · `gaze` (sight band above 0, plus the description supports a stare) · `voice` (`vocal` in communication) · `breath` (`breathes` non-empty) · `secretion` (description supports an emitted substance) · `swarm` (`bodyPlan: swarm`) · `aura` (the description describes an emanation from the body as a whole that acts on everything around it, such as a presence, a field, a chill, or a glow; a targeted effect that ends in a body part is that part's instrument, and "controls" or "generates" language alone never satisfies this predicate).

### 5.7 Allowed actions per instrument (16 actions)

Actions: `strike, lash, crush, rake, shove, drain, ambush, beam, hurl, spray, burst, cloud, snare, ward, mend, terrorize`. Grain ruling: stab/gore/impale = strike; slash/cut/tear = rake; texture is carried by names, never new actions.

| Instrument | Allowed actions |
|---|---|
| jaws | strike, crush, rake, drain, snare |
| fangs | strike, drain, ambush |
| beak | strike, crush, rake, drain, ambush |
| tusks | strike, shove, rake, crush, terrorize |
| horns | strike, shove, crush, ward, terrorize |
| antlers | strike, shove, snare, terrorize |
| trunk | lash, snare, shove, spray, strike |
| tongue | lash, snare, strike, drain |
| crest | beam, burst, terrorize, ward |
| lure | ambush, beam, snare |
| claws | strike, rake, crush, shove, ambush |
| talons | strike, rake, crush, snare |
| fists | strike, crush, shove |
| hooves | strike, crush, shove |
| pincers | strike, crush, snare, shove, ward, hurl |
| blades | strike, rake, lash |
| spurs | strike, rake, ambush |
| wings | strike, lash, shove, hurl, ward |
| tail | strike, lash, crush, shove, snare, hurl |
| stinger | strike, drain, ambush, terrorize |
| rattle | ward, terrorize |
| coils | crush, snare, shove, ward |
| hide | ward, shove |
| shell | ward, shove, crush |
| spines | strike, rake, ward, hurl, burst |
| tendrils | lash, snare, crush, drain, shove, strike |
| roots | snare, strike, shove, drain, ward |
| pseudopods | strike, crush, shove, snare, lash, drain |
| spinnerets | snare, ward, hurl |
| light-organs | beam, burst, ward, terrorize, mend |
| vents | spray, cloud, burst, ward |
| core | beam, burst, ward |
| antennae | lash, snare |
| body | strike, crush, shove, ward, burst, terrorize |
| mind | snare, shove, hurl, crush, drain, ward, terrorize, mend |
| gaze | terrorize, snare, drain, beam |
| voice | terrorize, ward, burst |
| breath | spray, cloud, burst, beam |
| secretion | spray, cloud, burst, drain, snare, ward, mend |
| swarm | cloud, strike, drain, snare, rake, terrorize |
| aura | ward, cloud, terrorize, drain, mend |

### 5.8 Abilities, the catalog, and signatures

- At generation an individual gets the species signature plus 2 or 3 rolled abilities: instrument from the species list, action from that instrument's allowed set, medium from primary or rolled secondary, intensity 1 to 100, name drawn from the catalog cell (element x action) or the neutral pool for that action. The template never lists rolled abilities; it declares instruments and the signature.
- Catalog files: `consolidated-<element>.md` (16 cells each, 14 elements, about 20,900 names) and `neutral-pools.md` (one pool per action). Names carrying `[instrument tags]` are only drawable by species whose anatomy or channels match a tag.
- **Signature ability rules (all six ratified):** (1) baseline grammar fields are mandatory (instrument, action, medium, intensity band) so a game that does not know the species still runs it; bespoke behavior is per-game interpretation. (2) Exactly one per species. (3) Intensity is a band rolled per individual. (4) The signature may use an instrument outside the species list and even outside the allowed-actions matrix, but only registry vocabulary. (5) It is the species' lore-defining act, sourced from the description first; combat-legible; no mechanics in prose; medium must have element or affinity cover. (6) Name in a GRANDER register than catalog names, exempt from the 2-word limit, and collision-checked against every name in all 14 catalog files and the neutral pools; if it collides, rename.
- Name form rules for anything you coin: American English, no possessives, no hyphens, no borrowed franchise names (Pokemon and similar), no real-world weapons, no Earth fauna or flora proper references, no nuclear-age military register.

### 5.9 Temperament and appearance (declared for completeness; nothing to author)

Temperament is five stored axes (boldness, curiosity, energy, aggression, sociability) rolled last per individual, tilted by the rolled body; templates declare nothing. Appearance `finish` rolls from global odds (standard, gleam about 1 in 40, prismatic about 1 in 400, eclipse about 1 in 4,000); templates declare nothing unless deliberately overriding.

## 6. Procedure (generation-layer order; do every step, in order)

1. **Read the sources in full.** The species entry and the whole home-planet history. Note the exact sentences that describe the body, the engineered purpose, the environment, and the present day. These quotes are your evidence for every later step.
2. **Description status.** If the description is already in the full species register (body appositive, engineered purpose, present-day turn, 60 to 140 words), keep it verbatim with `descriptionStatus: "source"`. If it is a two-sentence stub, write the upgraded description per section 3 using only facts from the stub and the planet history, mark `"upgraded"`, and list in the walkthrough every added clause with its source sentence.
3. **Buried-auto-trait pass.** From the body facts, list every trait the body DEMANDS (these become `guaranteed`). Then list traits the description merely suggests (these go in the pool with weights).
4. **Physiology.** Fill every field in section 4. Anatomy from the 34 keys, justified part by part from the description; if the description names no clean part, author the minimum honest set and say so. Size bands as realistic absolutes. Lifespan from the wear rubric. Environmental fields from the planet's climate and the body. Capabilities and senses as bands with one-line reasons.
5. **Instruments.** 1 to 3. Each physical instrument must be in anatomy; each channel must satisfy its predicate. Prefer the parts the description actually uses to fight or work.
6. **Archetype weights.** A weighted subset of the 16 that matches how the body and description read.
7. **Attribute bands.** All ten, 0 to 100, with intelligence never in true-human range; use the legacy `statRatings` only as a relative gauge.
8. **Element.** Primary from `type`; secondaries are whatever the graph allows for the home planet (you do not pick one; you may override odds only with a lore reason).
9. **Trait pools.** `guaranteed`, `rolledCount`, `pool` with justified weights; respect the exclusion pair; keep the 1 to 3 total.
10. **Signature ability.** Identify the lore-defining act from the description (quote it). Classify instrument, action, medium against the FULL description (the pilot lesson, ratified by Nick: the instrument is the body part where the effect TERMINATES on the target, not the physics that produces it; if prey is drawn into the creature's grip, the instrument is the gripping part, not `mind` and not `aura`, even though the pull is gravitational or mental in origin). Before coining a name, search every `consolidated-*.md` and `neutral-pools.md` for the species name (case-insensitive): a catalog ledger note that reserves or records a signature name for this species is a ratified prior ruling by Nick; use that name unless the source description contradicts it, and say so in the walkthrough. Otherwise coin a grander-register name and run the collision scan: search every `consolidated-*.md` and `neutral-pools.md` for the exact name (case-insensitive); rename if found. Write the one-line description in canon voice.
11. **Catalog check through the species lens.** For each instrument x allowed action x medium (primary plus each on-graph secondary) combo, count the drawable names in the catalog cell plus the neutral pool (respecting instrument tags). Report any combo with fewer than 6 names as a thin-combo finding in the walkthrough. Never pad a cell yourself.
12. **Encyclopedia entry.** Write `docs/species-templates/<key>.encyclopedia.json`: `{ "key": "<key>", "title": "<Name>", "category": "xalians", "definition": "...", "related": [] }` in the Encyclopedia register (section 3), one or two sentences, built only from the template and the sources. The orchestrator merges it into `docs/encyclopedia/encyclopedia.json` and computes `related` mechanically.
13. **Self-check** against every constraint in section 4 and the canon list in section 2. Validate the JSON parses.
14. **Write the walkthrough** `docs/species-templates/<key>.md`: for every judgment (each anatomy key, each guaranteed trait, each pool weight, sizes, lifespan, environment, instruments, archetype weights, attribute bands, the signature's four fields and name, every upgraded-description clause) one line with the supporting source quote. Then the thin-combo findings, then open questions for Nick as direct prose questions, one at a time.

## 7. Outputs (exact paths)

- `C:\dev\src\xalians-catalog\docs\species-templates\<key>.json` (the template, section 4 shape)
- `C:\dev\src\xalians-catalog\docs\species-templates\<key>.md` (the walkthrough with quotes, thin-combo findings, open questions)
- `C:\dev\src\xalians-catalog\docs\species-templates\<key>.encyclopedia.json` (the entry)
- Report per-field summary and every open question in your final message.

## 8. Species needing authored anatomy

Smokat, Newtapede, Luceras, Figzy, Akinza: the description names no clean part. Author the minimum honest set (`body` is always legal; `pseudopods` for formless bodies; Figzy needs the `mind` channel plus at least `body`) and flag every authored key in the walkthrough.

## 9. Independent validation (run by the orchestrator after the migration agent finishes)

A separate agent, forbidden from reading any summary document, any prior template or record of the species, and this skill's worked reasoning, receives the template, the walkthrough, and the Encyclopedia entry, and verifies against ONLY `species.json` and `planets.json`: every quoted source sentence exists verbatim; every factual clause in the upgraded description, the signature description, and the Encyclopedia entry is SUPPORTED, UNSUPPORTED, or CONTRADICTED with the quoted source; every section 4 constraint holds; every canon constraint in section 2 holds; the signature name has no catalog collision. Verdict per artifact: PASS or FAIL with failing items. Anything UNSUPPORTED is removed or rewritten before Nick sees it.

## 10. Presenting to Nick

Present inline, never link-only: the full template JSON, then the walkthrough's judgment lines, then the validator's verdicts, then open questions one at a time in prose with a recommendation. Explicit sign-off ratifies; discussion does not. Batch by planet when migrating several species. End with the State/Next block.

## 11. Relationship to the other skills

- `lore-voice`: section 3 is its species and glossary registers, inlined; invoke it only if you need the full exemplar corpus.
- `consolidate-element`: produced the catalog files this skill reads; never modify catalog files during migration.
- `blind-audit`: the context-free record trio runs on schema changes and, at Nick's call, on one representative record per planet batch, not per species.
