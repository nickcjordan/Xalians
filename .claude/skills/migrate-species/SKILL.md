---
name: migrate-species
description: Migrate one Xalian species from its legacy species.json entry to a ratified species template (Stage 3 of the creature-system redesign), self-contained with every registry, enum, canon constraint, verification step, and output contract inlined so an independent agent can run it without reading other files. Use for each of the 29 legacy species and for authoring new species.
---

# Migrate Species (Stage 3): self-contained runbook

One species in, one ratified species template out, plus its Encyclopedia entry. This file is deliberately complete: every registry and rule you need is inlined below. Do not go looking for the design doc or catalog rules; if something here conflicts with an older document, this file wins (it was consolidated from the ratified design doc, the anatomy registry, the ability catalog rulings, and Nick's process rulings on 2026-09-01; v2.2 after the two Graviclaw test runs; v2.3 adds the validator script; v2.4 adds the denial log, overrides, and the orchestrator's denial review; v2.5 adds the one-surface-key rule; v2.6 adds the species artwork as a source and the conjured-familiar rule; v2.7 replaces the count-and-draw trait model with independent per-trait percents; v2.8 carries the ratified registry definitions in section 5.5; v2.9 rules that an unlisted trait has a 0 chance, so pools list only traits above 0; v2.10 bans the dramatic sign-off; v2.11 adds conduits; v2.12 ratifies the medium table and adds operating rule 7, levers not stone; v2.13 states the em-dash rule covers the walkthrough and that sense organs are never anatomy; v2.14 archetype weights are percents summing to 100; v2.15 the row shape must be authored per species, never a stepped ladder; v2.16 Encyclopedia opens on the species name, note strings restated in single quotes; v2.17 a named partial surface is the covering when nothing else is named or shown; v2.18 the fleeting clause covers swarm and conjured bodies only; v2.19 forelimb work overrides the art only when no forelimb bears weight; v2.20 vents covers an oral spray organ, a flesh animal with the hide anatomy key takes the hide covering; v2.21 inner quotation marks inside a quoted source sentence are written as single quotes; v2.22 planet source is planetRecords.json and the temperature band validates against the habitable band). The single exception is source canon: the species description in `species.json` and the planet history in `planets.json` are the facts you derive from, and this file never overrides them.

## 0. Operating rules (read first)

1. **Location.** All work happens in the repo worktree `C:\dev\src\xalians-catalog` (branch `data/ability-catalog`). Read inputs from `C:\dev\src\Xalians\lambda\src\json\` (the main checkout, read-only). Write outputs only to `C:\dev\src\xalians-catalog\docs\species-templates\`. The validator script lives at `docs/species-templates/tools/validate-template.js` in that worktree and is run from the worktree root. Never write anywhere else, never write into any plans folder, never write into `docs/species-templates/overrides/` or `validation-log/`, never run git commands (Fable commits).
2. **Source-only rule (Nick, 2026-09-01).** Every factual claim about the species comes from the ORIGINAL text of `species.json` (its `description`), the species artwork (`docs/species-templates/art/<key>.png`), and, for planet context, the relevant planet entry in `planetRecords.json` (its `history` array and typed physical, environment and report blocks) with `planetStatus.json` for political context. You must NOT read or rely on summaries: not `CLAUDE.md`, not `canon.md`, not `voice.md`, not any design doc, not any prior template, not any prior record of this species, not memory. Summary-derived scope and causation claims contaminated earlier work and were caught only by source reads. Quote the source sentence that supports each judgment in your walkthrough. Quotations are copy-pasted verbatim (the validator checks each one character for character); if you paraphrase, do not use quotation marks, and never cite a planet-wide statement as if it were about this species.
3. **Fresh derivation.** Do not read `docs/design/sample-record-graviclaw.json`, any existing `docs/species-templates/*` file for the species you are migrating, or any prior migration notes for it. The migration is a derivation from source, not a copy.
4. **Labor.** The agent running this skill authors the template and prose itself, in its own turn. Never delegate to a subagent or background task. An independent validator pass (section 9) is run afterward by the orchestrator, not by you.
5. **Prose voice.** Any in-universe prose you write (the upgraded description, the signature description, the Encyclopedia entry) follows the voice rules in section 3. No em-dashes anywhere, including the walkthrough and the Encyclopedia entry (the script fails the walkthrough on one); use a colon between a judgment label and its reasoning and commas for asides. American English.
6. **Numbers are not sacred inputs.** The species' legacy `statRatings`, `height`, `weight`, and legacy `traits` block are a RELATIVE gauge between species, never values to copy. Only the description is a fixed input. You propose realistic absolutes and bands.
7. **Levers, not stone (Nick, 2026-09-02).** Every rule, registry, table, and percent in this skill is a tuned setting that will be adjusted as the platform's games are built against real creatures, not a law. Follow the rules as written for this run, but when a rule forces an outcome that is clearly wrong for the species in front of you (a definition that misclassifies it, a matrix row that forbids what its lore plainly shows, a percent scale that cannot express it), do both: comply, and record the case in the run's `## Orchestrator notes` / `## Script denials` section with the rule strained and the smallest change that would fix it. The orchestrator reports it to Nick in the same message. Silence about friction is the failure mode; working around a rule without recording it is worse.

## 1. Inputs

- `C:\dev\src\Xalians\lambda\src\json\species.json`: find the species entry: `{ name, id, type, planet, height, weight, description, statRatings, traits }`. `description` is the fixed input. `type` is the primary element. `planet` is the home planet.
- `C:\dev\src\Xalians\lambda\src\json\planetRecords.json` (rebuilt 2026-09-02; `planets.json` is legacy and must not be read): the home planet's `history` array (long-form prose, unchanged) plus the typed blocks: `physical.derived.gravityEarth` (the gravity figure to quote), `environment.habitableBandC` (where life persists; the species temperature band must sit inside it, section 5.5), `environment.meanC`, `environment.extremeC` (planetary record extremes, never a species tolerance), `report.terrain.features` (terrain), `report` (the Generator's environmental report: mobility, fauna, hazards, output priorities) and `biosphere`. Read it with node, e.g. `node -e "const p=require('C:/dev/src/Xalians/lambda/src/json/planetRecords.json').find(x=>x.key==='grimedes');p.history.forEach(h=>console.log(h+'\n'));console.log(JSON.stringify({g:p.physical.derived.gravityEarth,env:p.environment,terrain:p.report.terrain},null,1))"`.
- `C:\dev\src\Xalians\lambda\src\json\planetStatus.json`: the planet's mutable political and economic layer (control, population bands, resources, labor, infrastructure, unrest). Context for why a creature was engineered and for whom; it is not physical canon and settles no physiology field.
- The species artwork: `C:\dev\src\xalians-catalog\docs\species-templates\art\<key>.png` (a render of the canonical SVG in `my-app/src/svg/species/`). Open it with the Read tool and LOOK at it. The art is original source material on equal footing with the description: it settles body plan, anatomy keys, wings, tails, claws, eyes, and how many bodies the creature is. When the art shows a part the text does not name, the part is sourced (cite it as `art:` in the walkthrough, e.g. `art: long curled tail`), not authored. When the art and the text disagree, say so in an open question and follow the text for behavior and the art for the body.
- The ability-name catalog: `C:\dev\src\xalians-catalog\docs\ability-catalog\consolidated-<element>.md` for the species' primary element and each on-graph secondary (section 5.4), plus `neutral-pools.md` in the same folder. Cell format: lines `**<action> (N):** Name · Name [instrument tag] · Name (dual: element) · ...`. Names in `[tags]` are restricted to species whose anatomy includes one of the listed keys or channels.
- Nothing else.

## 2. Canon constraints (hard, never announce them in prose)

- **Xalians are sexless.** No mates, offspring, parents, breeding, lineage, or gendered pronouns. Pronoun is "it". Every Xalian is printed by a Generator. Packs, guardianship, and twin generations from one Scrambler Token are fine.
- **Conjured familiars are projections, not life (Nick, 2026-09-02).** A species may conjure a number of hologram-like or ghost-like familiars from a central mind and fight through them as a swarm; the familiars are not living creatures, so this is neither creating life nor summoning, and when they are destroyed they phase away rather than die. Describe them as projections or conjurations held by the mind, never as offspring, pets, or independent creatures. The `swarm` channel is the instrument for such a familiar swarm even when the creature's own `bodyPlan` is not `swarm`.
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
- **Encyclopedia entry register**: one or two sentences, encyclopedic and definitional, opening on the species name followed by the category noun ("The Kosanos is a heavy four-legged browser of Floria"; the script warns when the name is absent), cross-referencing canon terms by name (the home planet, named places and institutions), no flourish, no ellipsis. Never name the element key or any registry word in prose (no "dark-element", no "anchored"); describe the body and the act instead.

- **No dramatic sign-off (Nick, 2026-09-02).** The last sentence of a species description, a signature description, or an Encyclopedia entry states what the creature does now, plainly. It never stages a scene the sources do not contain, never turns the creature into a metaphor or a moral, and never lands on a flourish written for effect. Banned patterns: "the difference between X and Y"; "hears the joke it has become"; "long after the Ectoghoul has gone"; "a body that scatters at will is"; any clause built on so-that, until-nothing, or whatever-is-hunted; any personified consequence (a gallery that takes nothing, an overseer who cannot hold it) invented as a connective. Test: if the sentence would read as a movie trailer line, cut it and state the fact. A connective may join two sourced facts; it may not stage an event. The lore's own closing move (present-day struggle, Scrambler Tokens, an ellipsis) belongs to planet histories, not to species descriptions, which end on a plain present-tense fact.

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
  "archetypeWeights": { "<archetype>": 55, "<archetype>": 30, "<archetype>": 15 },   // subset of the 16; integer percents that sum to exactly 100 (one archetype is rolled per creature; Nick, 2026-09-02)
  "attributes": { "strength": [lo,hi], "vitality": [lo,hi], "endurance": [lo,hi], "agility": [lo,hi], "reflex": [lo,hi], "intelligence": [lo,hi], "willpower": [lo,hi], "instinct": [lo,hi], "charisma": [lo,hi], "resilience": [lo,hi] },
  "affinityOdds": { "none": 0.75, "secondary": 0.25 },   // OPTIONAL; omit to inherit the 75/25 baseline; declare only as a lore-justified override
  "traits": {
    "pool": { "traitKey": percent, ... }        // only traits with a chance above 0, each an integer 1 to 100, rolled independently; 100 = every individual; a trait not listed has a 0 chance
  },
  "instruments": ["..."],                   // 1 to 3; physical ones must appear in anatomy; channels must satisfy their predicate
  "conduits": { "<instrument>": "<element>" },   // OPTIONAL; instruments the sources show channeling an element (section 5.7a); omit when none
  "signatureAbility": {
    "name": "...",                          // grander register, exempt from the 2-word limit, collision-checked against the full catalog
    "instrument": "...", "action": "...", "medium": "...",
    "intensity": [lo, hi],
    "description": "..."
  }
  // no appearance block unless deliberately overriding the global finish odds: "appearanceOdds": { "prismatic": 0.005 }
}
```

Constraints the template must satisfy: all keys and enum values are lowercase (`"grimedes"`, never `"Grimedes"`); `breathes` is a subset of `environmentalTolerance.ambientMedia`; `traits.pool` lists only the traits with a chance above 0, each an integer percent 1 to 100; absence means 0 (Nick, 2026-09-02: the registry is additive and new traits will be added, so an exhaustive list would go stale); at least one listed trait sits below 100; the two exclusion partners are never both at 100; `traits.guaranteed` and `traits.rolledCount` are retired (a guaranteed trait is a pool entry at 100); `archetypeWeights` keys are from the 16-archetype roster; `manipulation` band upper bound above 40 only when grasping anatomy or `telekinetic` is guaranteed; every physical instrument is in `anatomy`; `shell` and `hide` never co-occur in `anatomy`; the signature's action is any of the 16 actions and its medium is the primary element or an on-graph secondary.

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

Rules (trait model ratified by Nick 2026-09-02): the pool lists each trait the species can carry with the percent chance an individual gets it, and a trait not listed has a 0 chance; each is rolled INDEPENDENTLY at generation and the result is on or off; there is no trait count, no minimum, and no cap, and the expected count is the sum of the percents divided by 100. Every species has at least one trait strictly between 0 and 100 so individuals differ. A trait the body demands is written at 100 (a shelled or plated body means `armored: 100`; a tree that grips the ground means `anchored: 100`; a non-corporeal body means `phasing: 100`). A trait the environment demands may also sit at or near 100 (a creature generated for a world of perpetual night is `nocturnal` at 95 or 100; the few that are not are Generator variance). A trait the species never carries is simply not listed. Rarity is per trait: `foresighted` or `telekinetic` at 2 to 8 percent. Exclusion pair: `pack-bonded` and `solitary` may both be in the pool, but the generator rolls the higher percent first and skips the partner if it lands, so never write both at 100. Every percent must be justified against physiology, the art, the description, or the planet's environment in the walkthrough; a planet-wide sentence may justify an environmental adaptation (`nocturnal`, `resistant`) but never a behavior (`perceptive`, `stealthy`, `menacing`). Generation order for tilts (2026-09-02, after the trait-model audit): tilts multiply the authored percent first, clamped to 1 to 99; an entry at 100 is exempt from tilts (a body-demanded or environment-demanded trait stays universal); then exclusion partners are compared on their tilted percents and the higher is rolled first. An expected-count figure for a pool with an exclusion pair counts the lower partner at its percent times one minus the higher partner's percent. Registry tilts (stealthy down with mass, anchored/armored/menacing up with mass or size, ramming up with sprint, perceptive up with senses, telekinetic up with manipulation, resistant up with resilience, mind-sealed up with willpower, foresighted up with instinct, hypnotic/inspiring/pack-bonded up with charisma, solitary down with charisma, slippery up with agility, regenerative up with vitality, phasing up with ghost affinity on corporeal bodies) apply at generation automatically; do not re-declare them per species.

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

### 5.5 Physiology enums, capabilities, and actions (ratified definitions, 2026-09-02)

Every value below is the complete set an agent may assign; the definitions and selection rules are the ratified text of `docs/species-templates/REGISTRY-DEFINITIONS.md`, carried here verbatim so this file stays self-contained.

Rules that apply to every enum:

- The key describes function or presentation, never material or looks. Material lives in `composition`; looks live in the art and the description.
- The element never decides a physiology value. A plant-element bird is `flesh`; a fire-element creature is not `energy`.
- One value per single-valued enum. When a body fits two, apply the selection rule in that enum's section; if the rule does not settle it, take the value the art shows and list the field under Authored fields.
- A covering value and a composition value never describe the same part. An exoskeleton, carapace, shell, or casing of any material is always a covering (`chitin` when the body grows it, `plating` otherwise) and never a composition secondary; a composition secondary is a substance inside or of the body (a skeleton, a core, horns, a limb).
- A transient state produced by an ability (a cat that atomizes into smoke, an ape that forms ice armor, a body in constant flame) never changes composition, covering, or body plan. The resting body is what is classified; the state is an ability or a trait.

#### corporeality (2)

- `corporeal`: has a physical body that occupies space and can be touched, struck, and held.
- `non-corporeal`: has no persistent physical body; matter passes through it and it through matter. Carries `phasing` at 100 (the script fails otherwise) and a composition of `spectral`, `energy`, or `gas` (the script warns otherwise).

#### composition (8; primary required, secondary optional and different)

What the body is made of at rest.

- `flesh`: living animal tissue, muscle and organ, whatever covers it.
- `plant`: living vegetable tissue: wood, fiber, stem, leaf, root.
- `mineral`: stone, crystal, sand, or glass held together as a body.
- `metal`: metallic body, whether grown, forged, or assembled.
- `slime`: viscous or gelatinous mass with no fixed internal structure.
- `gas`: a body of vapor, smoke, or cloud that holds a shape at rest.
- `energy`: a body of light, plasma, charge, or heat with no matter to speak of.
- `spectral`: a body of the ghost register: present, visible, and acting, but made of neither matter nor energy that instruments can name.

Secondary rule: declare a secondary only when a second substance forms a structural part of the resting body (a limb, a casing, horns, a core, or a skeleton), never for a coating, an emission, a weapon it makes, or a transient state. Composition is not bound by the anatomy block's external-parts rule: an internal structural substance the description names, such as metal bones, counts. A rocky exoskeleton over slime is `slime` alone with covering `plating`; crystal horns on a furred body are `flesh` primary, `mineral` secondary; a body that can become smoke is `flesh` alone. A gas a body is filled with or buoyed by is not its composition: a hydrogen-filled jellyfish is `flesh`.

Disambiguation: a chitin crab is `flesh` (chitin is its covering); a stone golem is `mineral`; a fog creature that is fog at rest is `gas`; a ghost is `spectral`; a rooted mass of living roots is `plant`.

#### bodyPlan (9)

How the creature presents in the field and moves through it at rest. The plan is chosen by the body the creature stands, swims, drifts, or flies with; anatomy lists the parts and the plan does not repeat them.

- `biped`: stands and moves on two legs; forelimbs, if any, are free for other work. A winged creature that stands and walks on two legs is `biped` with a `flight` capability, not `avian`.
- `quadruped`: stands and moves on four limbs. Same wing rule as `biped`.
- `multiped`: stands and moves on more than four limbs, or on a limb arrangement that no other key names (a torso on a crab's legs; a body borne on roots or tendrils that shift it).
- `serpentine`: a long body that moves by undulation, with no limbs or with limbs too small to bear it.
- `avian`: a winged body whose primary movement is flight and which lands or perches between flights; bird, bat, or insect alike, but only when the description or art shows flight as the way it moves, not merely that it has wings. A bird-shaped body the description shows running, standing, or fighting on its legs is `biped`; a body that flies to travel and rests on legs between flights is `avian`.
- `piscine`: a body built for movement through liquid: finned, streamlined, or jet-driven; may leave the water but is defined by it.
- `amorphous`: a body without a fixed outline that flows, spreads, or reforms as it moves.
- `swarm`: the creature presents as many bodies acting as one, whether the units are its own flesh, split-off pieces, or conjured projections held by a central mind. A species is `swarm` only when the units are what acts: the source shows the creature fighting, defending, or working through the many. A species that merely travels or lives in groups, each member acting for itself, takes the plan of one member. When a single central body exists, its parts still go in anatomy.
- `floating`: a body that hangs, drifts, or glides in its medium with no wings and no fins, held up by gas, field, or the ghost register. Speed and direction do not matter; the absence of wings and fins does. A fast wingless flier is `floating`.

Selection rule: choose the plan by how the body is borne at rest (legs, undulation, fins, wings, drift, many units). The plan is the stance at rest, not the stance in the pose: when the description names the number of legs the creature stands on, that number decides, and a rearing, crouching, or leaping pose in the art does not override it; when the description is silent, the art decides: a creature drawn on all fours is `quadruped` even if it can rise, and otherwise the test is whether the forelimbs bear weight: a creature whose forelimbs in the art are free of the ground and end in hands, fists, claws held up, tools, or wings is `biped`, and one whose forelimbs reach the ground as legs is `quadruped`, whatever pose it is drawn in. A description that names the forelimbs doing work (grasping, digging, striking with the arms) settles `biped` over the art only when the art does not show the forelimbs bearing weight; a hand-user drawn resting on all fours is `quadruped` (Nick, 2026-09-02: Imprit, a tinkering monkey drawn on all fours, is `quadruped`); a description that names it running or standing on all fours settles `quadruped`. When a body could read as more than one plan, apply the keys in this order and take the first that fits: `swarm`, `floating`, `piscine`, `avian`, `amorphous`, `serpentine`, `multiped`, `quadruped`, `biped`. A body whose outline is fixed is never `amorphous` however soft it is, except that a slime or gas body held in a rigid casing with no bearing limbs is `amorphous`, since the casing is a covering and the body inside it has no plan of its own; a body with more than four bearing parts, roots and tendrils included, is `multiped` before it is `serpentine`. A body that moves through ground rather than over it takes the plan its bearing parts give it and carries the movement in the `burrow` capability; there is no rooted or sessile plan, because living inside ground is the ratified `burrow` capability.

Disambiguation: a bat that hunts on the wing is `avian`; a winged humanoid that crouches and walks is `biped`; a jellyfish is `floating`; a bird-shaped creature that flies is `avian` whatever its element; a bat-like controller whose fight is its conjured cloud is `swarm`.

#### covering (9; one value)

The outer surface of the resting body. Distinct from composition (what the body is) and from the `armored` trait (a mechanical fact a covering may carry).

- `fur`: hair or pelt.
- `feathers`: feathers, down, or plumes.
- `scales`: overlapping plates of skin or horn, reptile or fish style, flexible as a whole.
- `chitin`: a hard exoskeleton or carapace grown by the body. Carries `armored` at 100 and the `shell` anatomy key unless the walkthrough argues otherwise; the script warns when armored is not at 100 (the `shell` expectation is checked by the validator agent, not the script).
- `hide`: thick, leathery, or rugged skin with no armored aspect. Pairs with the `hide` anatomy key and never with `shell`.
- `plating`: rigid plates that are not grown chitin: stone, metal, bone, or crystal armor integrated into the body. Same `armored` and `shell` expectation as `chitin`.
- `crystal`: a surface of crystal growth or facets covering the body. Same `armored` and `shell` expectation as `chitin` and `plating`; the script warns when it does not hold. Crystal that grows as horns, spines, or an emitter on another surface is anatomy (`spines`, `horns`, `core`), and the covering is whatever surrounds it.
- `mist`: a surface of vapor, smoke, or haze with no firm boundary. A `gas` composition takes `mist`.
- `bare`: smooth unprotected skin, membrane, or surface; the default for any body, of any composition, whose surface neither source names.

Selection rule: name the surface that covers the trunk of the resting body. A rigid casing grown or worn over any body is `chitin` when the body grows it as an exoskeleton and `plating` otherwise, whatever the body underneath is made of; a mineral or metal body whose surface is the body itself is `plating`. A partial second surface (feathers on a scaled body, a barbed tail on a furred body, metal on the limbs of a flesh body) does not change the value; the part goes in anatomy and the covering is what covers the trunk. When a source names a partial surface (a partially feathered body, a furred back) and no other surface is named or shown for the trunk, take the named partial surface as the covering (Nick, 2026-09-02: Dromeus is `feathers`, not `bare`). When neither source names or shows a surface, the covering is `bare`, listed under Authored fields, whatever the composition, except that a flesh animal body carrying the `hide` anatomy key takes the `hide` covering (2026-09-02: Kosanos, Hippochamp; `bare` is for membranes, naked skin, slime, plant and mineral surfaces). Take `hide` only when a source sentence or the art shows a thick, leathery, wrinkled, or rugged surface. Most art is a flat silhouette: the art shows a surface only when the outline itself is drawn as that surface (tufted or shaggy edges for `fur`, plume edges for `feathers`, plate or scale edges for the rigid values); a smooth outline shows nothing, and the description decides or the default applies. Mass never decides a covering. A surface the description calls partial ("partially feathered") is not the covering; the covering is what the rest of the trunk shows, and if nothing shows it, `bare` by the same fallback. When one phrase names two surfaces ("a scaly exoskeleton"), the rigid one wins. A named surface always beats a default: a body the description says is made of, wrapped in, or surfaced with mist, smoke, or vapor takes `mist`. Armor a creature forms on demand is an ability, not a covering.

#### diet (6)

- `carnivore`: eats other creatures.
- `herbivore`: eats plant matter.
- `omnivore`: eats both.
- `photosynthetic`: feeds on light directly.
- `energy-feeder`: feeds on a non-food energy the description names it taking in: heat, charge, radiation, gravity, minds.
- `none`: does not feed at all, stated or implied by a body with no way to take anything in (spectral and energy bodies; a mineral body the description never shows feeding).

Selection rule: the word prey, or a sentence showing the creature consuming, dissolving, paralyzing to consume, or draining a victim, is evidence of feeding and settles `carnivore`; a sentence that shows only fighting, guarding, or harassing an opponent is not evidence of feeding. Eating plants, or grazing, browsing, or filtering plant matter or plankton, settles `herbivore`. `photosynthetic` requires both a `plant` composition and a source sentence naming light as what it takes in; a plant body shown absorbing anything else (power, minerals, the ground) is `energy-feeder`; any other body shown drawing in an energy, including light taken through an organ or a core, is `energy-feeder`. A creature that stores or channels an energy but is not shown feeding on it is not an energy-feeder. When the sources say nothing about feeding, take `omnivore` for a flesh, slime, or gas body, `energy-feeder` for a plant body, `none` for a spectral, energy, mineral, or metal body, and list the field under Authored fields. A predator sentence settles `carnivore` even when the creature might also eat plants; a plant-eating sentence settles `herbivore` even when it also fights; both kinds of sentence together settle `omnivore`.

#### communication (array of up to 5; empty means mute)

Outward signaling to other creatures. Controlling one's own body, familiars, or projections is not communication. An effect aimed at a target (hypnotizing it, terrorizing it) is an ability, not communication, even when it uses light or sound. No Xalian speaks a language.

- `vocal`: calls, cries, roars, songs, hisses; any sound the body makes to signal.
- `vibration`: signals by tremor, drumming, or percussion through ground, water, or air.
- `display`: signals to others by posture, color, light pattern, or gesture.
- `chemical`: signals by scent or secreted substance.
- `telepathic`: signals by direct impression on another mind; feeling and image, never words.

#### breathes and ambientMedia (phases, arrays; breathes is a subset of ambientMedia)

- `gas`: atmosphere of any chemistry.
- `liquid`: water or another liquid of any chemistry.
- `vacuum`: the absence of medium.

`breathes` lists the phases the body draws on to live; empty means a non-breather. `ambientMedia` lists the phases the creature can sustain activity in. Solid is never a medium: living inside rock or sand is the `burrow` capability. Chemistry, pressure, and humidity are not modeled.

#### senses.special (array, optional; omit rather than leave empty)

Senses beyond sight, hearing, and smell. Each must be supported by a source sentence or the art; none is authored to fill space.

- `echolocation`: locates by emitted sound and its return.
- `tremorsense`: reads vibration through ground or water to locate what moves.
- `electroreception`: senses electric fields and living charge.
- `psychic`: senses minds, feelings, and intent directly. Satisfies the `mind` channel predicate.
- `heat-sense`: senses infrared and body heat.
- `void-sense`: senses gravity, mass, and the structure of space; the dark register's sense.

#### lifespan (6; species-set, never rolled)

Bands of a working life. Apply the cuts in order: composition first, then mass and metabolic intensity, then home-world harshness. Mass means the midpoint of the weight band authored in the size step, which precedes this one; when the size band is not yet authored, use the legacy weight as the gauge. For a `swarm` plan with a central body, the central body is what lives and dies, so its mass is the gauge and the swarm clause of cut 3 does not apply; the swarm clause is for a species that is the swarm. "Armored" below means an armored covering (`chitin`, `plating`, `crystal`) or the `shell` anatomy key, not the trait.

1. Spectral and energy bodies are `ageless` (still killable).
2. Mineral and metal bodies are `enduring`; a mineral or metal secondary on a flesh body does not change the band. This band is not moved by harshness.
3. Flesh, plant, slime, and gas bodies, by mass: below 20 kg are `fleeting` when the body is a swarm or a conjured-unit body (disposable by nature), and `short` otherwise, including a small flier that merely gathers in numbers (Nick, 2026-09-02: Avilily is `short`); 20 kg up to and including 200 kg are `standard`; above 200 kg are `long`. Then, after the mass cut, one adjustment: a body the description calls cold, slow, or long-lived, or that carries an armored covering, moves up one band (never past `long`). Cut 4 (harshness) is applied last.
4. Harshness moves a flesh, plant, slime, or gas body one band down only when the description says the environment shortens its life.

- `fleeting`: a season to a few years.
- `short`: a few years to a decade.
- `standard`: decades.
- `long`: many decades to a century or more.
- `enduring`: centuries.
- `ageless`: does not wear out.

#### genome.chirality (2, species template)

- `rolled`: each individual rolls levo or dextro at 50/50; the default. The generated record stores `levo` or `dextro`.
- `achiral`: the species has no handedness to roll; declared only when the body has no chiral chemistry (energy, spectral, some mineral). The record stores `achiral`.

#### lore.descriptionStatus (2)

- `source`: the species.json description is carried verbatim because it is already in the full register.
- `upgraded`: the description was rewritten from a stub using only the stub, the art, and the planet history.

#### capabilities (7 bands, 0 to 100)

Outcome-based: how well the creature does the thing, not how. 0 means it cannot. A band whose upper bound exceeds 60 needs a source sentence or a feature visible in the art. `flight` is the outcome and `bodyPlan` is the presentation: a `flight` band above 0 requires `wings` in anatomy, a `floating` or `swarm` body plan, or a non-corporeal body, and the script warns otherwise.

- `flight`: sustained movement through air under its own power.
- `swim`: movement through liquid.
- `burrow`: movement through solid ground, sand, or rubble.
- `climb`: movement up surfaces steeper than it can walk.
- `sprint`: short-burst ground speed.
- `leap`: distance or height cleared in one bound.
- `manipulation`: handling objects; an upper bound above 40 needs grasping anatomy (`claws`, `talons`, `fists`, `pincers`, `tendrils`, `pseudopods`, `trunk`, `tail`, `coils`) or `telekinetic` at 100.

#### actions (16; the verb of an ability)

Grain ruling: texture is carried by names, never by new actions. Stab, gore, and impale are `strike`; slash, cut, and tear are `rake`. Concealment is the `stealthy` trait, never part of an action.

- `strike`: a single direct blow or thrust that lands with impact.
- `lash`: a sweeping or whipping blow from a flexible part or a swept limb.
- `crush`: pressure applied and held: squeezing, clamping, compressing.
- `rake`: a cutting or tearing pass that opens the target.
- `shove`: force that moves the target rather than wounds it: pushes, rams, throws off balance.
- `drain`: takes something from the target and keeps it: vitality, heat, charge, will.
- `ambush`: a burst of closing speed that ends in a hit.
- `beam`: a focused projected line of energy or matter.
- `hurl`: a thrown or launched solid that travels to the target.
- `spray`: a projected stream or shower of matter over an area or line.
- `burst`: an outward release from the body that hits everything close at once.
- `cloud`: a lingering volume of matter or effect that occupies space.
- `snare`: holds, binds, pulls, or pins the target in place.
- `ward`: protects the user or an ally: shields, deflects, braces.
- `mend`: restores the user or an ally.
- `terrorize`: acts on the target's courage or will rather than its body.

#### instruments (34 anatomy keys plus 7 channels)

Defined in skill section 5.6, which this file does not replace. Standing rules restated: keys are functional, never material; external parts only; one surface key per species (`shell` is the armored aspect, `hide` the unarmored); a crab's snapping claws are `pincers`.

#### temperatureC

A sustained-normal-activity band in Celsius. It must lie inside the home planet's `environment.habitableBandC` in `planetRecords.json` (where life actually persists; the script fails it otherwise); a narrower sub-band is expected and is justified from the history and the body. Never validate against `environment.extremeC`, the planetary record extremes: Magmuth's extremes run to 420 C and nothing survives that, while its habitable band is the cooled obsidian islands at 40 to 105 C. Extending past the habitable band in either direction requires a quoted source sentence and is otherwise a validation failure. (2026-09-02: the old rule checked the legacy data-block extremes; records migrated before the planet rebuild were re-banded.)

#### What an agent may never assign

Anything not in these lists. The validator script fails any other value, and compound keys (`quadruped-avian`, `walking-legs`) are not values.

#### Note on rooted bodies

Xylum (Floria), a mass of living roots that lives mostly underground, is `multiped` (borne on more than four root-limbs) with a high `burrow` band. A `sessile` body plan was considered and declined on 2026-09-02: the ratified design already gives Xylum burrow movement, no other species among the 29 is rooted, and registry vocabularies are versioned and additive, so the value can be added later if a truly fixed species is authored.

### 5.6 Anatomy registry (34 keys) and innate channels (7)

Keys are functional, never material (a stone golem's fists are `fists`; composition carries stone). Parts, not effects. External functional parts relevant to action only; never internal organs. Anatomy is species-fixed. Sense organs are not anatomy: prominent external ears, large eyes, or a nose live in the `senses` bands (and in `communication: display` if they signal), never in anatomy, and never as `antennae`.

Head and mouth: `jaws` (full biting mechanism incl. mandibles) · `fangs` (piercing or venom teeth) · `beak` · `tusks` (external goring teeth) · `horns` (permanent cranial spikes incl. drill-horns) · `antlers` (branched rack) · `trunk` (muscular flexible snout) · `tongue` (projectile, sticky, or lashing) · `crest` (emissive or display head-growth) · `lure` (dangled bait appendage).
Limbs: `claws` (hooking or raking digits) · `talons` (raptorial grip-and-pierce) · `fists` (blunt striking hands) · `hooves` · `pincers` (opposing grip; a crab's, scorpion's, or lobster's claws that snap shut are `pincers`, never `claws`, whatever word the description uses) · `blades` (limb ending in a cutting edge) · `spurs` (limb spikes) · `wings` (strike, gust, shroud as well as flight).
Tail and trunk-body: `tail` · `stinger` (venom-injecting spike) · `rattle` (sound-warning tail organ) · `coils` (serpentine wrap-and-crush body).
Surface and armor: `hide` (an UNARMORED body surface used defensively: bare, leathery, furred, or scaled skin; declaring `hide` states that the body has no armored aspect) · `shell` (the armored aspect: a rigid enclosing casing, exoskeleton, carapace, or integrated plating) · `spines`. A species declares at most ONE of `hide` and `shell`; a shelled or plated body is `shell` and never also `hide` (Nick, 2026-09-02: the shell is specifically the armored aspect and hide implies there is no armored aspect). (rigid projections: quills, barbs, thorns, crystal growths).
Reach and grasp: `tendrils` (tentacles, vines, streamers) · `roots` (ground-anchored gripping or erupting structures) · `pseudopods` (temporary limbs coalesced from a formless body).
Emission structures: `spinnerets` · `light-organs` · `vents` (pressurized discharge openings anywhere on the body, including a spray tube or nozzle seated in the mouth; Nick, 2026-09-02: Venemist) · `core` (exposed radiant or crystal focal mass).
Sensory-dual: `antennae`. Catch-all: `body` (whole-body mass as instrument; universal fallback).

Innate channels (non-physical instruments) and the predicate each must satisfy in the template: `mind` (psychic element, a `psychic` special sense, or `telekinetic`/`hypnotic` at 100 in the trait pool) · `gaze` (sight band above 0, plus the description supports a stare) · `voice` (`vocal` in communication) · `breath` (`breathes` non-empty) · `secretion` (description supports an emitted substance) · `swarm` (`bodyPlan: swarm`, or the description and art show a conjured familiar swarm held by the creature's mind; the script warns in the second case and the validator agent confirms the sentence) · `aura` (the description describes an emanation from the body as a whole that acts on everything around it, such as a presence, a field, a chill, or a glow; a targeted effect that ends in a body part is that part's instrument, and "controls" or "generates" language alone never satisfies this predicate).

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

### 5.7a Conduits: what the medium can do through a part (mechanism and medium table ratified by Nick 2026-09-02)

The table in 5.7 answers one question: what can this part do physically. It never learns about element power. A second question is answered here: what can the element do when it is channeled through a part. A species may declare some of its instruments as **conduits** for an element (`"conduits": { "<instrument>": "<element>" }`, optional, usually empty or one entry). The predicate is strict and sourced: the description or the art shows the element's power leaving the body through that part (a horn that pulses with color to hypnotize, hands that project force, claws whose gravity deepens). Being of an element never makes a part a conduit; the part must be shown doing it. The element must be the species' primary or an on-graph secondary.

Rule: for an ability whose medium is X, an instrument's allowed actions are its 5.7 row, plus the medium row for X below if and only if the instrument is declared a conduit for X. For any other medium the instrument has only its 5.7 row. Channels (`mind`, `gaze`, `voice`, `breath`, `secretion`, `swarm`, `aura`) may be conduits like any other instrument. Names for a conduit ability come from the medium's catalog cell for that action.

| Medium | Actions the element can take through a conduit |
|---|---|
| fire | strike, beam, spray, burst, cloud, hurl, lash |
| water | spray, burst, cloud, snare, shove, mend, lash |
| dark | snare, crush, shove, drain, burst, ward, terrorize |
| light | beam, burst, ward, mend, terrorize, spray |
| plant | snare, ward, mend, lash, cloud, spray |
| electric | beam, burst, lash, strike, snare, spray |
| ghost | terrorize, drain, cloud, snare, ward |
| rock | ward, crush, hurl, burst, shove, strike |
| chemical | spray, cloud, burst, drain, snare |
| air | shove, burst, cloud, hurl, lash, ward |
| psychic | burst, snare, terrorize, ward, mend, drain, shove, hurl |
| ice | snare, ward, spray, burst, crush, mend |
| metal | strike, ward, hurl, beam, crush, rake |
| sand | cloud, spray, drain, snare, burst, rake |

Signature rule 4 still allows a signature outside the matrix, but a signature that a conduit would explain must declare the conduit instead of taking the exception; the script warns when a signature action is outside both the physical row and any declared conduit row.

### 5.8 Abilities, the catalog, and signatures

- At generation an individual gets the species signature plus 2 or 3 rolled abilities: instrument from the species list, action from that instrument's allowed set, medium from primary or rolled secondary, intensity 1 to 100, name drawn from the catalog cell (element x action) or the neutral pool for that action. The template never lists rolled abilities; it declares instruments and the signature.
- Catalog files: `consolidated-<element>.md` (16 cells each, 14 elements, about 20,900 names) and `neutral-pools.md` (one pool per action). Names carrying `[instrument tags]` are only drawable by species whose anatomy or channels match a tag.
- **Signature ability rules (all six ratified):** (1) baseline grammar fields are mandatory (instrument, action, medium, intensity band) so a game that does not know the species still runs it; bespoke behavior is per-game interpretation. (2) Exactly one per species. (3) Intensity is a band rolled per individual. (4) The signature may use an instrument outside the species list and even outside the allowed-actions matrix, but only registry vocabulary. (5) It is the species' lore-defining act, sourced from the description first; combat-legible; no mechanics in prose; medium must have element or affinity cover. (6) Name in a GRANDER register than catalog names, exempt from the 2-word limit, and collision-checked against every name in all 14 catalog files and the neutral pools; if it collides, rename.
- Name form rules for anything you coin: American English, no possessives, no hyphens, no borrowed franchise names (Pokemon and similar), no real-world weapons, no Earth fauna or flora proper references, no nuclear-age military register.

### 5.9 Temperament and appearance (declared for completeness; nothing to author)

Temperament is five stored axes (boldness, curiosity, energy, aggression, sociability) rolled last per individual, tilted by the rolled body; templates declare nothing. Appearance `finish` rolls from global odds (standard, gleam about 1 in 40, prismatic about 1 in 400, eclipse about 1 in 4,000); templates declare nothing unless deliberately overriding.

## 6. Procedure (generation-layer order; do every step, in order)

1. **Read the sources in full.** The species entry, the species artwork (open the PNG and describe what you see in one paragraph at the top of the walkthrough: body plan, visible parts, number of bodies, posture), and the whole home-planet history. Note the exact sentences that describe the body, the engineered purpose, the environment, and the present day. These quotes are your evidence for every later step.
2. **Description status.** If the description is already in the full species register (body appositive, engineered purpose, present-day turn, 60 to 140 words), keep it verbatim with `descriptionStatus: "source"`. If it is a two-sentence stub, write the upgraded description per section 3 using only facts from the stub and the planet history, mark `"upgraded"`, and list in the walkthrough every added clause with its source sentence.
3. **Buried-auto-trait pass.** From the body facts, list every trait the body DEMANDS (these go in the pool at 100). Then list traits the environment demands (at or near 100) and traits the description or art merely suggests (at a justified percent).
4. **Physiology.** Fill every field in section 4. Anatomy from the 34 keys, justified part by part from the description; if the description names no clean part, author the minimum honest set and say so. Size bands as realistic absolutes. Lifespan from the wear rubric. Environmental fields from the planet's `data` block and history plus the body. Capabilities and senses as bands with one-line reasons. Any field with no supporting source sentence takes its minimum honest value (`[]` for communication, no `special` sense, the fewest anatomy keys the body demands) and is listed in the walkthrough's Authored fields section; the JSON carries no provenance, so that section is the only record of which values are guesses.
5. **Instruments.** 1 to 3. Each physical instrument must be in anatomy; each channel must satisfy its predicate. Prefer the parts the description actually uses to fight or work. Then declare `conduits` (section 5.7a) only for instruments the description or art shows channeling an element, and quote the sentence.
6. **Archetype weights.** A subset of the 16 that matches how the body and description read, as integer percents summing to exactly 100 (the script fails otherwise). One archetype is rolled per creature, so the number is the chance of that archetype, on the same 0 to 100 reading as the trait percents. Do not list an archetype below 5 (it will almost never land); fold it into a neighbor instead. The shape of the row is a judgment about the species, not a template: a species with one overwhelming nature gets one dominant archetype (45 or more) and few entries; a species that reads several ways gets a flatter row. Never default to an evenly stepped ladder (the first nine records all came out 5-4-3-2-1 and had to be re-authored); two to five entries, with gaps that mean something.
7. **Attribute bands.** All ten, 0 to 100, with intelligence never in true-human range; use the legacy `statRatings` only as a relative gauge.
8. **Element.** Primary from `type`; secondaries are whatever the graph allows for the home planet (you do not pick one; you may override odds only with a lore reason).
9. **Trait pool.** Every trait the species can carry, each with its independent percent and a one-line reason; name in the walkthrough any trait the body could plausibly carry that you left out, with the reason; body-demanded and environment-demanded traits at or near 100; rare traits in single digits; never both exclusion partners at 100. State the expected trait count (sum of percents divided by 100) in the walkthrough.
10. **Signature ability.** Identify the lore-defining act from the description (quote it). Classify instrument, action, medium against the FULL description (the pilot lesson, ratified by Nick: the instrument is the body part where the effect TERMINATES on the target, not the physics that produces it; if prey is drawn into the creature's grip, the instrument is the gripping part, not `mind` and not `aura`, even though the pull is gravitational or mental in origin). Before coining a name, search every `consolidated-*.md` and `neutral-pools.md` for the species name (case-insensitive): a catalog ledger note that reserves or records a signature name for this species is a ratified prior ruling by Nick; use that name unless the source description contradicts it, and say so in the walkthrough. Otherwise coin a grander-register name and run the collision scan: search every `consolidated-*.md` and `neutral-pools.md` for the exact name (case-insensitive); rename if found. Write the one-line description in canon voice.
11. **Catalog check through the species lens.** For each instrument x allowed action x medium (primary plus each on-graph secondary) combo, count the drawable names in the catalog cell plus the neutral pool (respecting instrument tags). Report any combo with fewer than 6 names as a thin-combo finding in the walkthrough. Never pad a cell yourself.
12. **Encyclopedia entry.** Write `docs/species-templates/<key>.encyclopedia.json`: `{ "key": "<key>", "title": "<Name>", "category": "xalians", "definition": "...", "related": [] }` in the Encyclopedia register (section 3), one or two sentences, built only from the template and the sources. The orchestrator merges it into `docs/encyclopedia/encyclopedia.json` and computes `related` mechanically.
13. **Self-check with the validator script.** From the worktree root run `node docs/species-templates/tools/validate-template.js <key>` (it reads the three output files, the two source files, the catalog, and this skill). It checks shape and registry membership, every structural constraint in section 4, the temperature band against the planet data block, the signature name against every catalog cell and the reserved-signature ledger (including a ratified instrument / action / medium if the ledger records one), prose form rules, and that every double-quoted string in the walkthrough exists verbatim in the sources. Fix and rerun until it prints `0 FAIL`; each WARN line must be answered in the walkthrough (a WARN is a judgment the script cannot make, not a pass). Paste the final script output at the end of the walkthrough under a heading `## Validator output`. It does not judge whether a claim is supported; that is still your job and the validator agent's.
    The script logs every run to `docs/species-templates/validation-log/<key>.jsonl` (never edit or delete that file; the orchestrator reviews it). **A FAIL is a denial, not a verdict on your idea.** When the script denies a value, do not silently replace it: record it in a `## Script denials` section of the walkthrough with the original value, the script's message, what you changed it to, and whether you believe the original was better and why. If you think the script is wrong (a false positive, a registry gap, a rule that does not fit this species), say so there and pass the same point with `--note "..."` on your next run so it lands in the log; the orchestrator can override a false positive or fix the script, but only if you leave the trail. Never write to `docs/species-templates/overrides/`; overrides are the orchestrator's alone.
14. **Write the walkthrough** `docs/species-templates/<key>.md`. Quotation convention: double quotes are reserved for verbatim source text (species description, planet history, or a registry definition from this file); everything else, including your own phrasings, field values, coined names, and the text of your own `--note` strings when you restate them, uses single quotes or backticks; when a source sentence you quote contains its own quotation marks, write those inner marks as single quotes so the span still pairs as one quotation, because the script treats every double-quoted span as a quotation to verify. Then, for every judgment (each anatomy key, each guaranteed trait, each pool weight, sizes, lifespan, environment, instruments, archetype weights, attribute bands, the signature's four fields and name, every upgraded-description clause) one line with the supporting source quote. Every evidence line names its source as `species` or `planet`; a planet-wide sentence may justify environment, temperature, and lifespan, never a species trait weight or a behavior (a world of perpetual night does not make one species perceptive). Then an **Authored fields** section listing every value with no source sentence, then the thin-combo findings, then open questions for Nick as direct prose questions, one at a time.

## 7. Outputs (exact paths)

- `C:\dev\src\xalians-catalog\docs\species-templates\<key>.json` (the template, section 4 shape)
- `C:\dev\src\xalians-catalog\docs\species-templates\<key>.md` (the walkthrough with quotes, thin-combo findings, open questions)
- `C:\dev\src\xalians-catalog\docs\species-templates\<key>.encyclopedia.json` (the entry)
- Report per-field summary and every open question in your final message.

## 8. Species needing authored anatomy

Smokat, Newtapede, Luceras, Figzy, Akinza: the description names no clean part. Author the minimum honest set (`body` is always legal; `pseudopods` for formless bodies; Figzy needs the `mind` channel plus at least `body`) and flag every authored key in the walkthrough.

## 9. Independent validation (run by the orchestrator after the migration agent finishes)

A separate agent, forbidden from reading any summary document, any prior template or record of the species, and this skill's worked reasoning, receives the template, the walkthrough, and the Encyclopedia entry, and verifies against ONLY `species.json` and `planetRecords.json` (with `planetStatus.json` for political context): every quoted source sentence exists verbatim; every factual clause in the upgraded description, the signature description, and the Encyclopedia entry is SUPPORTED, UNSUPPORTED, or CONTRADICTED with the quoted source; every section 4 constraint holds; the temperature band lies inside the planet `data` block range or carries a quoted justification; every value without a source sentence appears in the Authored fields section; no trait weight or behavior rests on a planet-wide sentence; every canon constraint in section 2 holds; the signature name has no catalog collision. The validator agent also runs `node docs/species-templates/tools/validate-template.js <key>` first and reports its output; a FAIL there is a FAIL for the template regardless of what the walkthrough claims.

**Art check (orchestrator, every species).** Before presenting, the orchestrator opens the species artwork and checks the walkthrough's art reading and the body-plan call against it. Two of the first seven runs misread the art (a hanging climber read as a crouch; a seated rabbit with its forepaws on the ground read as forepaws held clear), and both errors flowed straight into body plan, size, and anatomy.

**Denial review (orchestrator, every species, before presenting to Nick).** Run `node docs/species-templates/tools/validate-template.js --review <key>` and read the walkthrough's `## Script denials` section. For every FAIL the script ever raised on this key, decide one of three things and act on it: (a) legitimate denial, nothing to do; (b) false positive or a rule that is wrong for this species: add an entry to `docs/species-templates/overrides/<key>.json` (`{ code, match, reason, by, date }`), and if the agent's original value was the better idea, restore it in the template; (c) a script defect or registry gap: fix the script (or this skill's registry, and the script's mirror of it) and append a dated line to `docs/species-templates/tools/CHANGELOG.md` saying what was denied, why it was wrong, and what changed. Report the review outcome to Nick in the same message as the species, so no good idea is lost to a script rule and every rule the script enforces has been re-examined against real output at least once per species. Verdict per artifact: PASS or FAIL with failing items. Anything UNSUPPORTED is removed or rewritten before Nick sees it.

## 10. Presenting to Nick

Present inline, never link-only: the full template JSON, then the walkthrough's judgment lines, then the validator's verdicts, then open questions one at a time in prose with a recommendation. Explicit sign-off ratifies; discussion does not. Batch by planet when migrating several species. End with the State/Next block.

## 11. Relationship to the other skills

- `lore-voice`: section 3 is its species and glossary registers, inlined; invoke it only if you need the full exemplar corpus.
- `consolidate-element`: produced the catalog files this skill reads; never modify catalog files during migration.
- `blind-audit`: the context-free record trio runs on schema changes and, at Nick's call, on one representative record per planet batch, not per species.
