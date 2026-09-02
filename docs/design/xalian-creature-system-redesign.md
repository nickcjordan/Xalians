# Xalian Creature System Redesign

## Context

Xalians is pivoting: the core product is now a creature-generation engine plus an ownership/collection platform (a "digital Pokémon binder" with trading), with games (starting with the existing Duel prototype) acting as consumers of creature data rather than the center of the design. The current stat system (8 Pokémon-style stats, `canFly`/`attackRange` traits, element-weighted point distribution in `lambda/src/ai.js`) was a first implementation and is being scrapped, not adjusted. This document is the ground-up redesign of the creature data structure, the generation pipeline, and the lore-integration decisions that support them, produced from a multi-session brainstorm with Nick (2026-08-30). The existing stats generator code can be fully replaced; the 14-element/14-planet lore structure is retained and extended per the decisions below.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | Creature records are **immutable after mint**; game progress lives outside the creature; an append-only history layer is a secondary, optional feature | 95% — Nick explicitly approved | Conversation 2026-08-30 |
| 2 | Generation is **seed + stored snapshot + generatorVersion** (deterministic expansion, but the expanded record is canonical and never recomputed for existing creatures) | 95% — Nick approved after explanation | Conversation 2026-08-30 |
| 3 | Attribute naming: plain lowercase data keys + **most-universally-known display names** (revised from the earlier evocative Option C at Nick's direction); lore flavor concentrated in trait/ability names | 95% — Nick set the principle and approved the final list | Conversation 2026-08-30 |
| 4 | Each element gets a formally assigned **mechanical fantasy**, including reframing Dark as gravity/void/time (not shadow-spooky) | 90% — Nick approved ("sounds good") | Conversation 2026-08-30; Grimedes lore already mentions gravity/time experiments (`lambda/src/json/planets.json`) |
| 5 | Secondary types are replaced by a **graded affinity profile** constrained by a per-planet adjacency graph, with rare off-graph "anomalous" rolls | 85% — Nick approved direction but flagged the whole secondary-type concept as open; wants it non-gimmicky | Conversation 2026-08-30 |
| 6 | Species count will grow substantially; the species template format must make authoring cheap; size/weight bands widen dramatically | 95% — Nick confirmed | Conversation 2026-08-30 |
| 7 | Species declare `mintablePlanets`: some are exclusive to their home planet, others mintable on several; mint origin is recorded as provenance | 90% — Nick talked himself into this | Conversation 2026-08-30 |
| 8 | Moves are replaced by **abilities**: lore-grounded, grammar-composed (instrument × archetype × medium × intensity), 1–3 instruments per species, one hand-authored signature ability per species, zero AI at mint time | 95% — Nick approved after mechanics walkthrough | Conversation 2026-08-30; this doc §8 |
| 9 | Rarity is **hybrid**: emergent under the hood (no stamped tier in the record), with a computed PSA-style grade displayed by the binder UI | 95% — Nick chose Hybrid explicitly | Conversation 2026-08-30 |
| 10 | The 10-attribute set in §4 is **ratified**: strength, vitality, endurance, agility, reflex, intelligence, willpower, instinct, charisma, resilience (reflex singular; resilience over toughness) | 95% — Nick approved the final list | Conversation 2026-08-30 |
| 11 | The duel migrates to this schema only after the schema is finalized (schema-first) | 95% — Nick explicit | Conversation 2026-08-30 |

## 0. TERMINOLOGY — FINAL RULINGS 2026-08-31 (supersede any older word usage below)

Full-schema word audit with Nick; where this section conflicts with older text in this doc, this section wins.

- **`archetype`** = the creature's rolled identity favoring two attributes (stalwart, rogue, ...). REVERTED from "build" (2026-08-31): Nick reserves **"build" for the platform/user concept of deck composition** ("a fire build") — build never appears in the creature schema. This revert is safe because the ability sub-field formerly called archetype is now `action`. Species template field: `archetypeWeights`.
- **`action`** = what an ability does (strike, snare, mend...); the renamed ability sub-field. The abilities *layer* is still called **`abilities`** — each ability HAS an action; abilities were never renamed to actions.
- **Mint vocabulary PURGED** (contradicted the anti-NFT stance; Generators *generate*): `mintedAt`→**`generatedAt`**, `mintOrigin`→**`origin`**, `mintablePlanets`→**`generatorPlanets`**; prose says "generated"; keys freeze at **first generation**. `serial` stays (coin/collectible register, no crypto taint).
- **`capabilities`** = the graded 0–100 bodily can-do block, renamed from "aptitudes" (Nick's ruling: aptitude = capacity to *learn*; capability = current ability to *do*): flight, swim, burrow, climb, sprint, leap, manipulation. (Flagged: adjacency with the `abilities` layer — see chat 2026-08-31.)
- **`climateTolerance`** renamed from `climate` (the field stores the survivable band, not a home climate; the planet-data redesign's actual-climate field won't collide).
- Signature ability's one-line text field: **`description`**, not "nature" ("nature" is architectural vocabulary here and a stored Pokemon mechanic there — double contamination).
- Kept after audit with disclosed quibbles: `physiology`, `abilities`, `corporeality`, plus clean passes: `attributes`, `traits`, `instrument`, `medium`, `intensity`, `element`/`affinities`, `temperament` (5 stored 0–100 axes: boldness, curiosity, energy, aggression, sociability — weighted roll tilted by rolled attributes, rolls LAST; adjectives are derived display; "personality" = what develops in life, never stored), `appearance`, `finish`, `senses`, `covering`, `bodyPlan`, `composition`, `respiration`, `diet`, `communication`, `serial`, `anomalous`.
- Retired words (never reappear): build (in-schema), phenotype, moves, stats/statRatings, canFly, attackRange, mint*, aptitude, skittish, and all struck trait/archetype names.
- Xalians are **sexless** (canon, in lore-voice canon.md): printed by Generators, no reproduction, no gender field, pronoun "it".

## 1. Design principles

**Creatures describe nature; games derive rules.** The record contains only descriptive facts about the creature (what it is, how it's built, what it can do physically). Every game ships its own derivation layer mapping those facts to its mechanics. Nothing like `canFly` or `attackRange` (game rules stored in the creature) survives.

**Immutable core, additive schema.** A minted creature never changes. The schema only ever gains fields/traits/species; games ignore what they don't understand. This is what lets the registry outlive any individual game.

**Variance is the product.** Collectible value requires same-species creatures to differ along comparable axes: rolled physiology, attribute spreads, trait draws, affinity oddities, phenotype variants, provenance. Every layer of the schema deliberately creates one of these axes.

**Lore-native everything.** Each mechanic maps onto existing canon: seeds = Scrambler Token genomes, expansion = Generators, generator versions = Generator firmware eras, mint origin = which planet's Generator ran the token, trait pools = planetary ecology.

**Balance never touches the record (ratified 2026-08-31).** Overpowered outcomes are fixed in exactly two places: (1) per-game derivation layers — each game tunes its own formulas and interpretation tables per patch, per species, per ability class; the duel's 75%-max-HP hit cap is the existing example of a derivation-layer safety valve; (2) the next generator version — template/odds corrections apply to future generations only; existing over-tuned early records become coveted "gen-1" specimens (the Magic/Pokemon precedent, legible via versioned provenance). A nerf is always a transparent change to interpretation or future generation, NEVER a mutation of owned records and never a silent "ignore that field." Pre-launch guard: simulated generation batches eyeballed with Nick before first generation.

**Store what the Generator did, never what words mean (ratified 2026-08-31).** The record stores every roll's mechanical facts inline (archetype's favored attributes, each landed trait with the percent it was rolled at (PROPOSED 2026-09-02, replaces the guaranteed-vs-rolled split), ability intensity/medium); definitions, taglines, bands, and interpretation live in the registry, where they improve forever. Corollary (ratified same day): **`generatorVersion` pins the ENTIRE content-table snapshot** (species templates, all vocabularies, odds); no field ever resolves against "current" vocabulary; the registry keeps every historical snapshot (required anyway for seed verification).

## 2. Creature record schema

Six layers, most-permanent first. Sketch (field names are the stable API):

```jsonc
{
  // RATIFIED STRUCTURE 2026-08-31 (supersedes earlier sketches; worked example = Graviclaw pilot).
  // Root = table of contents: two identity scalars, provenance block, creature layers in generation order.

  // identity
  "id": "xal_01J8...",
  "species": "graviclaw",

  // how this record came to exist
  "provenance": {
    "seed": "7f3a9c...",              // 128-bit Scrambler Token genome
    "generatorVersion": "1.0.0",      // pins the ENTIRE content-table snapshot; frozen forever
    "schemaVersion": "1.0.0",
    "generatedAt": "2026-09-14T...",
    "origin": "grimedes",             // which planet's Generator expanded the token
    "serial": 213                     // Nth of this species ever generated
  },

  // the creature
  "physiology": {                                   // REVISED 2026-09-01 (blind-experiment round)
    "corporeality": "corporeal",
    "composition": { "primary": "flesh" },          // secondary omitted when N/A (additive extra)
    "bodyPlan": "multiped",
    "anatomy": ["pincers", "walking-legs"],         // registry-keyed parts; physical instruments must appear here
    "covering": "chitin",
    "heightCm": 198, "weightKg": 372,               // rolled within species bands
    "lifespan": "enduring",                         // species-set enum: fleeting|short|standard|long|enduring|ageless (wear-out canon, never years)
    "genome": { "chirality": "dextro" },            // levo|dextro 50/50; achiral species-declared; never mapped to gender
    "diet": "carnivore",
    "communication": ["vibration"],                 // vocal|vibration|display|chemical|telepathic; [] = explicitly none
    "breathes": ["gas", "liquid"],                  // closed phase enum; [] = does not breathe
    "environmentalTolerance": {
      "ambientMedia": ["gas", "liquid"],            // gas|liquid|vacuum — what can safely surround the body; chemistry is the element matrix's job
      "temperatureC": { "min": -15, "max": 20 }     // sustained normal activity; a measurement, not a graded value
    },
    "capabilities": {                               // rolled 0–100 within species bands
      "flight": 0, "swim": 52, "burrow": 31, "climb": 18,
      "sprint": 12, "leap": 4, "manipulation": 44
    },
    "senses": { "sight": 55, "hearing": 28, "smell": 47, "special": ["tremorsense"] }
  },

  "archetype": { "key": "stalwart", "favors": ["resilience", "willpower"] },  // roll fact stored inline

  "attributes": {
    "strength": 74, "vitality": 61, "endurance": 65, "agility": 14, "reflex": 38,
    "intelligence": 42, "willpower": 78, "instinct": 71, "charisma": 19, "resilience": 93
  },

  "element": {
    "primary": "dark",
    "affinities": { "dark": 100, "ghost": 44 }      // primary duplicated at 100 on purpose (games read one map)
  },
  // "anomalous" field REMOVED — anomaly concept scrapped 2026-08-31 (see §5b)

  "traits": { "armored": 100, "anchored": 100, "stealthy": 60 },   // PROPOSED 2026-09-02 (pending Nick): the traits that landed, each with the tilted percent it was rolled at; 100 = body- or environment-demanded

  "temperament": {                                  // rolled LAST, tilted by the rolled body; adjectives derived at display
    "boldness": 81, "curiosity": 48, "energy": 25, "aggression": 66, "sociability": 22
  },

  "appearance": { "finish": "gleam" },              // variant/pattern/palette reserved, omitted until real

  "abilities": [                                    // intensity 1–100 (audit-2: an entry's PRESENCE asserts the act exists, so 0 is contradictory; array required + never empty — the signature guarantees ≥1; absent abilities are simply not in the list, unlike capabilities where 0 is the explicit answer); names from the catalog; signature in the grander register
    { "name": "Point of No Return", "signature": true, "instrument": "pincers", "action": "snare",
      "medium": "dark", "intensity": 74,
      "description": "Collapses gravitational waves into a point inside its open claw, dragging prey toward the closing pincer." },
    { "name": "Wraith Vise", "signature": false, "instrument": "pincers", "action": "crush", "medium": "ghost", "intensity": 48 },
    { "name": "Null Grasp", "signature": false, "instrument": "mind", "action": "snare", "medium": "dark", "intensity": 33 }
  ]
}
```

**Uniform 0–100 scale (ratified 2026-08-31, Graviclaw pilot).** Every graded number in the record is 0–100: attributes, aptitudes, and graded senses. The original 0–10 "coarse on purpose" aptitude scale was struck at Nick's direction: 0–100 gives uniqueness and tie-breaking granularity (a rarity axis), keeps one simple contract for all graded values, and thresholds still work (duel Airborne = flight ≥ 60). 0–1000 was considered and rejected as false precision. Exact ties that remain are broken by games via attributes (two swim-50 creatures race on agility/endurance), which keeps attributes relevant by design.

**Optional-field contract (ratified 2026-08-31).** The schema defines every possible field and its full value space up front; optional fields (e.g. `composition.secondary`) are omitted when not applicable — never null, never empty-string. Games treat absence as "not applicable" and unknown fields as ignorable.

**Explicit-none principle (ratified 2026-09-01, refines the above).** Two kinds of fields: **universal dimensions** (a question every creature has an answer to — communication, diet, breathes, lifespan) are ALWAYS present, and "nothing" is stated explicitly: an empty array (`communication: []` = mute, `breathes: []` = non-breather, `favors: []` = the balanced archetype) or an explicit value (`diet: "none"`, `covering: "bare"`, `lifespan: "ageless"`, graded values at 0). **Additive extras** (things a creature simply has or lacks — `composition.secondary`, `senses.special` entries, rolled traits, non-signature ability descriptions, reserved appearance fields, absent affinities) are omitted when absent. Rationale (Nick): absence of a communication field must never be readable as "cannot communicate" — incapability is a measured fact, not an inapplicability. **Closed-set vs open-list corollary (ratified 2026-09-01):** closed sets (the 7 capabilities, graded senses) grade absence explicitly with 0; open lists (`abilities`, rolled traits) express absence by omission and their entries may never claim a zero grade — an entry's presence asserts the thing exists, so ability `intensity` is 1–100 and the `abilities` array is required and never empty (the signature guarantees one).

**Vocabularies are registry data (ratified 2026-08-31).** Every controlled vocabulary (traits, special senses, archetypes, instruments, body plans, coverings, ...) ships as machine-readable registry data: key + display name + one-line nature description, published alongside the schema. Games build interpretation tables from those files and ignore unknown keys; human docs are generated from the same data. There is exactly one canonical definition per key.

**History layer (secondary, optional):** a separate append-only event log keyed by creature ID (`minted`, `traded`, game-reported milestones). Never mutates the record; games may write events but can never depend on reading them. Deferred until a concrete use appears.

## 3. Seed, versioning, verification

- Mint: generate a random 128-bit seed → `expand(seed, generatorVersion, mintOrigin)` seeds a PRNG and makes every generation decision from its draws → store the full expanded record with seed + version.
- The stored snapshot is canonical. New generator versions apply only to new mints; existing creatures never change under their owners.
- Verification: anyone can re-run the pinned version's expander on the seed and byte-compare. This makes stats provably un-editable and makes seeds themselves shareable/collectible.
- Generator versions become provenance ("gen-1 creature") for free.

## 4. Universal attributes (ratified & frozen 2026-08-30)

Ten axes. Naming principle (Nick's rule): **use the most universally known word unless no plain equivalent exists** (Instinct is the earned exception — no single plain word covers perception + gut sense). Data keys are the lowercase forms and are frozen; no game-specific meaning is baked in — the "governs" column is illustrative, each game writes its own derivations. Games may re-skin display names in their own UI; the binder always shows canonical names. Lore flavor lives in trait/ability names, never here.

| Key | Display | Governs (examples across games) |
|---|---|---|
| `strength` | Strength | physical force — melee damage, strength contests, hauling |
| `vitality` | Vitality | life force — HP pools, health decay, longevity |
| `endurance` | Endurance | sustained output — stamina pools, race length, labor |
| `agility` | Agility | speed & maneuvering — movement range, racing, handling |
| `reflex` | Reflex | reaction time — evasion, initiative, timing/rhythm games |
| `intelligence` | Intelligence | brain power — puzzles, training speed, AI personality |
| `willpower` | Willpower | mental fortitude — status resistance, morale, focus |
| `instinct` | Instinct | perception/gut sense — detection, foraging, crit-style triggers |
| `charisma` | Charisma | charm/aura — companion bonding, intimidation, showmanship |
| `resilience` | Resilience | physical toughness — damage soak, harsh-environment survival |

Deliberate near-pairs, kept because they encode different creature fantasies: Vitality vs. Resilience (high HP but squishy vs. low HP but armored) and Intelligence vs. Instinct (clever tool-user vs. perfect predator). Willpower is mental fortitude, distinct from Intelligence.

## 5. Elemental identity & affinity system

### 5a. Mechanical fantasy per element (new canon — one crisp identity each, no overlaps)

| Element | Planet | Mechanical fantasy |
|---|---|---|
| Fire | Magmuth | heat & relentless aggression — burn, escalate, overwhelm |
| Water | Poseidas | flow & restoration — adapt, heal (Algael), redirect |
| Dark | Grimedes | **gravity, void & time** — pull, slow, warp, inevitability (NOT "spooky") |
| Light | Luminax | radiance & precision energy — reveal, focus, overcharge, pierce |
| Plant | Floria | growth & territory — spread, root, entangle, regenerate ground |
| Electric | Zolton | storm & surge — burst speed, chain effects, entanglement/linking (QED) |
| Ghost | Phantiri | incorporeality & dread — phase, haunt, fear, the untouchable |
| Rock | Stonera | permanence & immovability — armor, weight, endure, hold ground |
| Chemical | Drainov | reaction & corrosion — poison, dissolve, transmute, volatility |
| Air | Saiphus | wind & freedom — flight, push/pull positioning, evasion, weather |
| Psychic | Telypso | mind & perception — foresight, control, illusion, empathy |
| Ice | Krystos | stasis & preservation — freeze, lock, delay, deny |
| Metal | Veridium | machinery & precision — construct, reflect, reinforce, upgrade |
| Sand | Endessa | erosion & attrition — bury, wear down, conceal, outlast |

This resolves the three crowded clusters: Rock/Sand/Metal split into immovability vs. attrition vs. machinery; Dark/Ghost/Psychic split into gravity-time vs. incorporeal-dread vs. mind; Water/Ice split into flow-healing vs. stasis-denial. Each planet's lore gets a sentence or two of reinforcement where needed (mainly Grimedes).

### 5b. Affinity profile (replaces binary secondary type)

A creature's `element` (primary) is fixed by species and always affinity 100. Secondaries are **graded scores (1–99)** rather than a second label — a creature is "partially of a type," which games threshold however they like (the duel might treat affinity ≥ 50 as a full dual-type for STAB/effectiveness; a future game might scale a bonus continuously). **ANOMALY CONCEPT SCRAPPED (Nick, 2026-08-31):** no off-graph secondaries, no `anomalous` field; every secondary comes from the adjacency graph, always. Baseline odds become **75% no secondary / 25% one on-graph secondary** (the 1% anomalous share folds into secondary; tunable via simulated batches; species templates can vary from baseline). This also mooted the Codex anomalous-reachability finding: catalog coverage is bounded by the graph. Endessa's glitching-Generator lore stays as lore with no mechanical hook. NOTE: the *trait* pool formerly labeled "anomalous" (deepwater-touched, moonmarked, outer-signal — the cosmic-horror mystery marks) is a separate ratified concept and is NOT scrapped by this ruling; its tag should be renamed (e.g. `mystery`) to avoid the retired word.

### 5c. Element adjacency graph (new canon — lore-plausible secondaries per planet)

| Planet (primary) | On-graph secondaries | Lore rationale |
|---|---|---|
| Magmuth (Fire) | Rock, Chemical, Metal | volcanic mining world, industrial forges |
| Poseidas (Water) | Ice, Plant, Chemical | oceans, Algael ecology, toxic-algae origin |
| Grimedes (Dark) | Ghost, Psychic, Ice | void/black-hole rim, black-site experiments |
| Luminax (Light) | Fire, Electric, Psychic | twin suns, ION-9 mutations, prismatic life |
| Floria (Plant) | Water, Chemical, Psychic | quasi-sentient ecosystem, Genesis Prototype |
| Zolton (Electric) | Light, Air, Metal | storms, planetary grid, QED tech |
| Phantiri (Ghost) | Dark, Psychic | precursor tombworld, Dreadscape |
| Stonera (Rock) | Metal, Sand, Fire | liquid-metal subsurface ocean, Jorian Belt impacts |
| Drainov (Chemical) | Fire, Metal, Water | industrial meltdown, toxic waterways |
| Saiphus (Air) | Electric, Water, Ice | gas-giant storms, Neph jellyfish, high-altitude cold |
| Telypso (Psychic) | Ghost, Light, Dark | dream-logic reality, asylum world |
| Krystos (Ice) | Metal, Water, Dark | APEX cold-storage core, frozen resort ocean, Plague design site |
| Veridium (Metal) | Electric, Fire, Ghost | worldship machinery, forges, possessed precursor drones |
| Endessa (Sand) | Water, Rock, Ghost | drowned Kelpan-5, uncovered deep ruins |

Off-graph secondaries can still occur as an ultra-rare **anomalous genome** roll (`anomalous: true`) — canonically a Generator glitch (Endessa's glitching stolen Generator is the lore template). Anomalies are rarer and therefore more collectible than any on-graph combination.

## 6. Trait system

Traits are a **curated keyword vocabulary**: each trait is a descriptive fact about the creature with a display name, a one-line nature description, tags (`combat`, `movement`, `social`, `sensory`, `metabolic`, `anomalous`), and optional magnitude — but **no rules text**. Each game ships an interpretation table for the traits it understands and ignores the rest. New traits are additive; existing games are never broken by vocabulary growth.

**Restructured 2026-08-30 per Nick's direction: trait keys are foundational and cross-planet.** There is ONE shared vocabulary of generic, concept-named trait keys; no trait key belongs to a single planet. Planets and species influence *weights* (which traits their creatures tend to roll) and *flavor* (the lore explanation of how the trait manifests there), never exclusive ownership. Rationale: traits are game-facing mechanics vocabulary, and a trait usable by only a handful of creatures from one planet is too niche to implement against; broad keys keep build diversity open (e.g. `healer` heals any target type, so healers fit mixed squads). Planet-specific signature traits can be layered on later as an expansion; at this stage, foundational only.

**Trait mode field (ratified 2026-08-30).** Every trait carries a `mode`: `passive` (an always-true fact games read as modifiers, e.g. `armored`, `stealthy`) or `reactive` (a triggered behavior games read as an event response, e.g. `volatile`, `reflective`). The record still only describes nature; mode tells a game how to derive. Genuinely *active* special actions are never traits; they belong in ability space as hand-authored signature abilities (see parking lot: signature-ability deep-dive).

**`conduit` STRUCK (2026-08-30, Nick's ruling).** "Absorbs, routes, and re-aims energy" is an action the creature takes, so it is ability space, not a trait; it becomes signature-ability material for specific species (e.g. Zolton bloodstorm creatures). `venomous` renamed `toxic` (broader umbrella per the naming rule); `ambusher` renamed `stealthy` (concealment is the capability; ambush bonuses are game derivations).

### Trait system rules (ratified 2026-08-30)

1. **Anatomy gates, traits amplify.** Abilities are gated at mint by anatomy only: the instrument × archetype matrix, the species template's instruments, and (where needed) aptitude requirements on instrument picks (e.g. an aerial-only instrument requires flight ≥ N). Traits NEVER unlock or forbid abilities; they amplify and specialize. Lore justification is built in: abilities are minted from the creature's own body (nothing is "taught," unlike Pokémon's TM fiction), and a trait marks what the Generator engineered that line to *excel* at.
2. **Games render archetypes through aptitudes.** The same `ambush` is a dive from a flier, an eruption from a burrower, a charge from a sprinter. Plausibility of expression is a derivation-layer concern, not a data concern.
3. **Mediums always have lore cover.** An ability's medium comes only from the creature's element or rolled affinities, and affinities come from the adjacency graph, so off-type abilities can't be absurd (no water-type shooting unexplained lightning).
4. **No negative traits (ratified 2026-08-30).** Every trait is a capability; liabilities come from elements (type matrix), attribute spreads, and physiology, never from a trait roll (formally kills the old draft's `skittish`; "flammable" is the fire row of the effectiveness matrix, not a trait).
5. **Trait exclusion list.** A short, principled list of logically contradictory pairs that cannot coexist on one creature (first entry: `pack-hunter` × `lone-stalker`; extended as the walkthrough finds true conflicts). Species template weights handle mere implausibility; exclusions are only for contradictions.
6. **Guaranteed traits (ratified 2026-08-31, Graviclaw pilot; SHAPE SUPERSEDED 2026-09-02 by the independent-percent model below: a guaranteed trait is now a pool entry at 100, and the strictly-additive floor no longer exists as a structure).** Species templates declare a `guaranteed` trait list next to the rolled pool: species-defining traits every individual carries because the body demands it (chitin crab → `armored`; gravity-rooter → `anchored`). Generalizes the phasing/non-corporeal auto-grant precedent. The rolled pool is then **strictly additive** — a rare roll always has *more* than the classic baseline, never a classic missing its identity (Nick's rule: the standard must never be better than the rare). Template shape: `{ "guaranteed": [...], "rolledCount": [0,1], "pool": {...} }`, with guaranteed + max rolled staying within the 1–3 per-creature trait range. The 29-species migration includes a dedicated pass over every description to surface buried auto-traits (Yetimoth ice tusks, Terragoyle levitation, Smokat phasing, ...).

### Core trait vocabulary (draft v2 — generic keys)

**Role-noun rename ruling (ratified 2026-09-01).** Nick's rule: role-nouns belong to archetype; traits use descriptor/status/condition word forms ("has the ability to heal", not "is a healer"). Five keys renamed: `healer`→**`healing`**, `guardian`→**`protective`**, `pack-hunter`→**`pack-bonded`**, `lone-stalker`→**`solitary`** (still an exclusion pair), `charger`→**`ramming`** ("charging" was rejected for colliding with electric charge). The table below keeps the old keys as written; the renames supersede them.

**Trait tilt system (ratified 2026-09-01).** Trait draws are weighted rolls tilted by the individual's earlier rolls, mirroring the temperament-tilt mechanism (generation order already supports it: physiology → archetype → attributes → affinities → traits). Tilts live in each trait's registry entry; magnitudes are tuned in the simulated-batch eyeball session; tilts are never gates and never suppress below the species-authored floor. Under the independent-percent model (2026-09-02) a tilt multiplies the authored percent, clamped to 1 to 99; an entry at 100 is exempt; exclusion partners are ordered by tilted percent. Three tiers:
- **Physiology tilts (7):** `stealthy` ↓ rolled mass; `anchored` ↑ rolled mass; `menacing` ↑ rolled size; `ramming` ↑ rolled sprint (mild mass assist — momentum); `perceptive` ↑ average of graded senses; `telekinetic` ↑ rolled manipulation; `armored` ↑ rolled mass (mild; applies only where `armored` is in a rolled pool rather than guaranteed).
- **Attribute tilts (9):** `resistant` ↑ resilience; `mind-sealed` ↑ willpower; `foresighted` ↑ instinct; `hypnotic` ↑ charisma; `inspiring` ↑ charisma; `slippery` ↑ agility; `regenerative` ↑ vitality; `pack-bonded` ↑ charisma; `solitary` ↓ charisma (symmetric with its exclusion partner). Accepted cost: bounded rich-get-richer compounding, embraced as coherence (a stalwart-archetype individual drifts toward mind-sealed via its attribute tilt — the causal river archetype → attributes → traits → temperament).
- **Affinity tilts (1):** `phasing` ↑ ghost affinity, applying only to the rare rolled-on-corporeal path (the non-corporeal auto-grant is untouched). Input defined precisely (audit-2, 2026-09-01): the `ghost` value in the record's affinities map, **primary included** — a corporeal Ghost-primary creature (ghost: 100) is meaningfully likelier to phase, which reads right; eligibility predicate is `corporeality: corporeal`.
- **Untilted (7) with reasons:** `healing` and `protective` (dispositions whose only honest correlate, temperament, rolls AFTER traits — body-first causality forbids reaching forward; any attribute tilt would be decorative); `toxic`, `volatile`, `reflective`, `luminous` (driven by chemistry/surface/light-organ anatomy, all species-fixed, nothing individually rolled correlates); `nocturnal` (niche/habit, not body — good sight helps day or night; a sight tilt was considered and rejected as dishonest). Standard: a tilt must be an honest causal correlate, the same bar as the definition audit — no tilt for tilt's sake.

| Key | Nature (one line; games interpret) |
|---|---|
| `healer` | **RATIFIED 2026-08-30** — restores others; the creature's element colors how (Algael curing, empathic mending, stasis triage, machine repair, cleansing light); flavor never restricts eligible targets |
| `guardian` | **RATIFIED 2026-08-30** — instinct to shield and protect others |
| `regenerative` | **RATIFIED 2026-08-30** — rapid self-repair, organic or mechanical (self vs. others distinguishes it from `healer`; both on one creature is legitimate) |
| `armored` | **RATIFIED 2026-08-30** — natural plating, shell, or integrated chassis |
| `anchored` | **RATIFIED 2026-08-30** — cannot be moved against its will (pushes, throws, drags fail or weaken) |
| `phasing` | **RATIFIED 2026-08-30** — some physical interactions pass through it; AUTO-GRANTED at mint by non-corporeal physiology (all ghosts have `phasing`), rollable rarely on corporeal creatures (matter-slippers, reality-blurrers); games read physiology for degree, the trait for the flag |
| `resistant` | **RATIFIED 2026-08-30** — its body shrugs off contamination: toxins, disease, radiation, corrosion, hostile atmospheres (bodily domain only; mental resistance is `iron-willed`). Replaces the struck `enduring`, which was mushy and collided with the `endurance` attribute |
| `charger` | **RATIFIED 2026-08-30** — a living ram; its blows land far harder with movement behind them (passive) |
| `toxic` | **RATIFIED 2026-08-30** — its natural weapons deliver debilitating agents; element colors which (venom, contact poison, corrosive secretions, infectious spores) (passive; replaces the narrower `venomous`) |
| `volatile` | **RATIFIED 2026-08-30** — hazardous to strike; it reacts when hit, element-colored (caustic spray, discharge, thermal burst, spore cloud) (reactive) |
| `reflective` | **RATIFIED 2026-08-30** — energy directed at it returns to its source (reactive; the ranged-energy mirror of `volatile`'s contact punishment) |
| `menacing` | **RATIFIED 2026-08-30** — its presence erodes courage; nearby creatures fight worse, flee sooner (passive aura) |
| `hypnotic` | **RATIFIED 2026-08-30** — can entrance and hold attention, dulling a target's will to act (passive; renamed from `mesmeric` per the naming rule) |
| `perceptive` | **RATIFIED 2026-08-30** — perceives what hides; sees through concealment (passive; renamed from `keen-sensed`; the designed counter to `stealthy`) |
| `foresighted` | **RATIFIED 2026-08-30** — reads moments before they happen; reacts to attacks not yet thrown (passive, rare) |
| `mind-sealed` | **RATIFIED 2026-08-30** — its mind is sealed: nothing enters it, nothing sways it, nothing breaks it (passive; the mental twin of `resistant`; counters `hypnotic` and `menacing`). Replaces `iron-willed`, which was open to interpretation and collided with the `willpower` attribute |
| `pack-hunter` | **RATIFIED 2026-08-30** — stronger coordinating with others; fights better with allies nearby (passive; excludes `lone-stalker`) |
| `lone-stalker` | **RATIFIED 2026-08-30** — stronger operating alone; fights better with no allies nearby (passive; excludes `pack-hunter`) |
| `stealthy` | **RATIFIED 2026-08-30** — moves unseen and unheard; hard to detect until it acts (passive; replaces the narrower `ambusher` — ambush bonuses are a game derivation; `keen-sensed` is the natural counter) |
| `nocturnal` | **RATIFIED 2026-08-30** — night-adapted senses and habits; stronger in darkness (passive; games without light mechanics ignore it, by design) |
| `inspiring` | **RATIFIED 2026-08-30** — its presence bolsters others: allies near it fight harder and hold longer (passive aura; positive counterpart of `menacing`; distinct from `pack-hunter` which strengthens itself, and `guardian` which protects) |
| `slippery` | **RATIFIED 2026-08-30** — cannot be held: escapes grabs, pins, traps, and snares (passive; the counter to the snare archetype) |
| `luminous` | **RATIFIED 2026-08-30** — its body sheds light (bioluminescence, prismatic hide); neutralizes darkness: counters `nocturnal`'s advantage and strips shadow concealment for everyone nearby (passive; distinct from `perceptive` — removes the darkness rather than seeing through it) |
| `telekinetic` | **RATIFIED 2026-08-30** — moves things without touching them; the levitation is constant, the flinging is the derived ability (passive, rare; Terragoyle, Grimedes gravity-benders, Telypso psychics; amplifies hurl-archetype abilities) |

**Mystery/anomalous trait pool SCRAPPED (Nick, 2026-08-31)** — `deepwater-touched`, `moonmarked`, `outer-signal` are removed from the launch vocabulary entirely (previously ratified 2026-08-30 as ultra-rare cosmic-horror marks). Rationale: without the lore built out we'd be guessing, and it adds complexity and edge cases for no launch value. The cosmic-horror arc itself stays alive in canon and Nick wants to do more with it some other way; these traits are a natural candidate for a **later generator version** (the additive-forever schema makes retro-adding them free — new traits never break games). The trait vocabulary at launch is the 24 ratified keys, nothing reserved.

**`colossal` STRUCK from the trait vocabulary (2026-08-30, Nick's ruling).** Mass is already a real number in the record (the size roll); a trait restating it is redundant, and "what counts as colossal" is a per-game threshold. "Colossal" becomes a derived presentation concept (binder badge, per-game size classes) alongside the PSA-style rarity grade. `enduring` was also struck the same day, replaced by the sharper `resistant` (see table).

**`linked` STRUCK from the trait vocabulary (2026-08-30, Nick's ruling).** Bonds are not a mint-time trait; they are a future **platform-level relationship between two creature records**, formed by an in-world event (bloodstorm exposure, Telypso resonance, twin mint) and recorded in the append-only history layer, which any creature can potentially form. Games read the relationship, not a trait. The Zolton living-relay canon grounds the feature. A "bonds readily" trait can be added later if the pairing system needs it. Files alongside twin mints in future concepts.

Example planet weightings (flavor in parentheses is lore, not data): Zolton weights `conduit` (bloodstorm-forged energy channeling); Poseidas weights `healer` (Algael-curing tenders) and `resistant` (death-tide survivors); Phantiri weights `phasing` and `menacing`; Stonera weights `anchored` and `armored`; Drainov weights `resistant` (filterlungs) and `venomous`; Telypso weights `hypnotic`, `healer` (empathic), `foresighted`, `mind-sealed`; Krystos weights `guardian`, `resistant` (cold-stasis tolerance), `healer` (stasis triage); Veridium weights `armored`, `reflective`, `regenerative` (self-forging), `healer` (field repair). Healer flavor never restricts healing targets; a machine-flavored healer still heals flesh (its methods just look like surgery and splints rather than balm).

The superseded per-planet-named draft below is kept for flavor mining when authoring species lore (many entries survive as the *flavor text* of a generic key, e.g. gravewell → the Grimedes flavor of snare-type abilities; stormlinked feeds the future pairing relationship, not a trait):

- **Universal pool:** `pack-hunter` (thrives coordinating with others), `lone-stalker` (stronger isolated), `nocturnal` (night-adapted senses), `regenerative` (rapid tissue repair), `colossal` (extreme mass for its kind), `skittish` (flees before it fights), `keen-eyed` (exceptional long-range perception), `hardy` (survives environments that kill others).
- **Magmuth (Fire):** `emberhide` (skin radiates damaging heat), `charger` (devastating when building momentum), `bloodfeud` (fights harder against a foe that hurt it), `ashborn` (unbothered by heat/smoke obscurement).
- **Poseidas (Water):** `algael-rich` (body produces the healing substance), `mender` (tends wounded packmates), `tidecaller` (senses and rides currents/weather), `slick` (hard to grab or pin).
- **Grimedes (Dark):** `gravewell` (distorts local gravity, dragging things near), `timeworn` (perceives moments before they happen), `voidcloak` (light bends around it), `event-horizon` (what it holds does not escape).
- **Luminax (Light):** `prismhide` (refracts and scatters energy), `overcharge` (stores sunlight for one brilliant burst), `revealer` (its glow exposes the hidden), `dawnwake` (strongest at first light).
- **Floria (Plant):** `rooted` (anchors itself unmovably to ground), `overgrowth` (vegetation spreads where it lingers), `symbiote` (bonds with and bolsters another creature), `sporeveil` (emits disorienting spore clouds).
- **Zolton (Electric):** `stormlinked` (quantum-entangled with a paired object/creature), `surge` (explosive bursts of speed), `conductor` (channels and redirects energy through itself), `blackbolt` (carries the lethal radiation of black lightning).
- **Phantiri (Ghost):** `spectral` (partially incorporeal), `terror` (its presence erodes courage), `gravebound` (draws strength near death and the dead), `wraithstep` (moves without sound or trace).
- **Stonera (Rock):** `anchor` (cannot be pushed, thrown, or swept), `oreplated` (natural mineral armor), `siegeborn` (shrugs off massive single impacts), `chasm-dweller` (at home in depths and darkness underground).
- **Drainov (Chemical):** `venomous` (delivers potent toxins), `corrosive` (its touch dissolves material), `volatile` (dangerous to strike — it reacts), `filterlung` (immune to toxins and bad air).
- **Saiphus (Air):** `windrider` (masterful sustained flight), `galeforce` (its passage shoves things aside), `benthane-fed` (buoyant, lighter than it looks), `freespirit` (resists capture, restraint, and control).
- **Telypso (Psychic):** `empath` (reads and soothes emotional states), `foresight` (glimpses likely futures), `dreamweaver` (blurs what others perceive as real), `iron-will` (its mind cannot be entered).
- **Krystos (Ice):** `permafrost` (an aura of stilling cold), `cryostatic` (can suspend its own vitals to endure), `warden` (bred to guard and contain), `preserver` (what it protects does not decay).
- **Veridium (Metal):** `plated` (integrated machine-metal chassis), `mirrorshell` (reflects energy back at sources), `self-forging` (repairs and upgrades its own body), `dormant-code` (carries fragments of something that once thought).
- **Anomalous pool (reserved, ultra-rare, deliberately unexplained):** `deepwater-touched`, `moonmarked`, `outer-signal` — hooks for the cosmic-horror arc; no planet claims them.

**Trait model (RE-RATIFIED 2026-09-02, Nick's ruling; supersedes the count-and-draw model above and item 6's `guaranteed`/`rolledCount` shape).** Every trait in a species pool is rolled INDEPENDENTLY at its own percent (integer 1 to 100) when an individual is generated. 100 means every individual carries it; a trait that should never appear is omitted rather than written at 0. There is no trait count, no minimum, and no cap: an individual may carry zero traits or many, and the expected count is the sum of the percents divided by 100. `guaranteed` and `rolledCount` are retired: a body-demanded trait (chitin → `armored`) is a pool entry at 100, and an environment-demanded trait (a Grimedes species → `nocturnal`) sits at or near 100, with the shortfall read as Generator variance. Planet-level rules ("Grimedes always generates nocturnal") are therefore one line. Rarity is per trait (`foresighted`, `telekinetic` in single digits) and remains a primary rarity axis. Exclusion pairs (`pack-bonded`/`solitary`): both may sit in a pool, the generator rolls the higher percent first and skips the partner if it lands; both at 100 is invalid. Registry tilts apply as multipliers on the percent, clamped to 0 to 100, and never suppress below the species-authored floor. Rationale (Nick): the lore should drive the number directly, and a capped draw forced cases where a species-defining trait went missing or a trait was applied for no lore reason. Template shape: `"traits": { "pool": { "nocturnal": 95, "slippery": 45 } }`.

## 7. Physiology & locomotion

Replaces `canFly`. Every creature carries graded aptitudes 0–100 (rescaled 2026-08-31 from 0–10; see §2 uniform-scale ruling): `flight`, `swim`, `burrow`, `climb`, `sprint`, `leap` (ratified 2026-08-30; Luceras is jump-defined and no other aptitude captured it).

**Environmental block RE-RATIFIED 2026-09-01 (supersedes the 2026-08-30 `respiration` enum and `climateTolerance`).** The old `respiration: air|water|amphibious|none` was struck (Codex second opinion + Nick: "amphibious" names a lifestyle; organ words like gills/lungs are too Earth-anatomical; and enumerable media hit an exhaustiveness wall — a rock monster tolerates "everything"). Resolution: **media are phases, chemistry is elements.** The phase enum `gas | liquid | vacuum` is closed by physics (exhaustive by construction, on any planet); what a particular liquid is made of is an elemental question the 14×14 effectiveness matrix already answers exhaustively (a Drainov swamp = liquid that is Chemical-type exposure; its native breathers are Chemical-element and shrug it off; a Poseidas water-breather in it can breathe phase-wise but soaks Chemical-type exposure). Two fields: **`breathes`** (phase list where breathing works; `[]` = does not breathe) and **`environmentalTolerance: { ambientMedia, temperatureC: {min, max} }`** (what can safely surround the body; endpoints defined loosely in the registry as "sustained normal activity"; Celsius is a measurement, not a graded value — negative temps don't violate the 0–100 rule). The two lists diverge exactly where it matters: surface-breathing leviathan = breathes `[gas]`, ambient `[gas, liquid]`; ghost = breathes `[]`, ambient all three. **Audit-2 fixes (ratified 2026-09-01):** (a) the drowning derivation applies ONLY when `breathes` is non-empty — "drowning = breathes.length > 0 AND submerged in a medium not in breathes" (the naive rule made non-breathers drown in everything); (b) validation invariant: `breathes` ⊆ `ambientMedia` (you cannot breathe a medium that harms you to touch); (c) the phase enum ships as **versioned registry vocabulary**, not a physics-exhaustiveness claim — `gas | liquid | vacuum` at launch, future exotics are additive entries; (d) chemical-exposure wording corrected: a typed environmental exposure (Drainov swamp = liquid + Chemical-type) is **priced by games through the effectiveness matrix**, never an automatic immunity for matching-element natives; (e) dimensions not modeled (pressure, humidity, composition) are contractually "not modeled," never "unlimited tolerance." Solid isn't a medium — living in rock/sand is the `burrow` capability. Nothing else (pressure, humidity, atmosphere chemistry, per-medium temperature) gets added until a real species demands it. Breathing MECHANISM is species prose/registry flavor, never record data.

**Physiology deep-dive additions (ratified 2026-08-30).** Design philosophy per Nick: fully codify all scanner-reportable aspects of the body, including fields no current game reads — immutable records cannot be retrofitted, so future games get their data now. Added: **`corporeality`** (`corporeal | non-corporeal`; the field the phasing auto-grant rule reads), **`composition`** (primary + optional secondary substance: `flesh | plant | mineral | metal | slime | gas | energy | spectral` — Voltish is flesh/metal, Bioflim slime/mineral), **`manipulation`** (seventh 0–10 aptitude: grasp/carry/operate — hands, tentacles, trunk, telekinesis; the duel's flag-carrying and any item/tool game read it), **`diet`** (`carnivore | herbivore | omnivore | photosynthetic | energy-feeder | none`), and a structured **`senses`** suite: graded 0–100 `sight`/`hearing`/`smell` (rescaled 2026-08-31) plus a `special` list from a controlled, additively-extendable vocabulary (`echolocation | tremorsense | electroreception | psychic | heat-sense | void-sense`).

**Registry definitions (ratified 2026-09-02).** Every physiology enum value, the seven capabilities, and the sixteen actions now carry a definition and a selection rule for bodies that fit two values, in `docs/species-templates/REGISTRY-DEFINITIONS.md` (mirrored verbatim in the migrate-species skill, section 5.5). Highlights: body plan is the body the creature is borne on at rest (a walking winged creature is biped or quadruped with a flight capability; `swarm` covers conjured-unit fighters such as Tetrahive); a covering and a composition never describe the same part (any exoskeleton or shell is a covering, never a secondary); lifespan is cut by composition, then mass, then one adjustment; unstated diet and surface resolve by stated fallbacks and are listed as authored. A `sessile` body plan was considered and declined (Xylum is `multiped` with burrow movement). Five blind validation passes preceded ratification.

**Second ring (ratified 2026-08-30):** **`bodyPlan`** (`biped | quadruped | multiped | serpentine | avian | piscine | amorphous | swarm | floating`; the enum describes, art/description stay authoritative for looks), **`covering`** (`fur | feathers | scales | chitin | hide | plating | crystal | mist | bare`; distinct from composition and from `armored`; binder-filterable), **`climate`** (low/high tolerated °C, mirroring planetRecords temperature format so planet demands and creature tolerances compare directly; species-set), **`communication`** (RE-RATIFIED 2026-09-01, blind-experiment finding: `signaling` was vague and `mute` violated the optional-field contract — new value set is channel-specific: `vocal | vibration | display | chemical | telepathic`; the field stays an array so multi-channel species work; a species with no communication omits the field entirely; Graviclaw's claw percussion = `vibration`). **Rejected:** `activityCycle` (collides with the `nocturnal` trait; habit stays species prose). **Lifespan RATIFIED 2026-09-01** (unparked by the blind-record experiment + wear-out canon): Xalians do not age biologically — their engineered bodies **wear out** (internal working canon in lore-voice canon.md; the Nightcap/telomere passage is about Vallerii, not Xalians). `physiology.lifespan` is an **enum, species-set, never rolled per individual** (a rolled "96 years" was rejected as false precision that also imports an Earth calendar): `fleeting | short | standard | long | enduring | ageless`. `ageless` (not "immortal" — ageless Xalians can still be killed) is species-declared for non-corporeal/non-wearing bodies. Registry entries carry loose in-world glosses, never year figures. Species values are authored via a wear rubric: body mass + metabolic intensity (hard-working bodies wear faster; cold/slow/armored wear slowest), composition (mineral/metal/crystal outlast flesh), home-world environmental harshness (field machinery degrades faster). Other rejections kept: buoyancy folds into flight, reproduction has nothing to report (only Generators create life).

**Final physiology block (as of 2026-09-01):** seven capabilities (flight, swim, burrow, climb, sprint, leap, manipulation), corporeality, composition, bodyPlan, anatomy, covering, height/weight, lifespan, genome (chirality), diet, communication, breathes, environmentalTolerance, senses.

**Anatomy field (ratified 2026-09-01, blind-record experiment finding).** Physiology gains an **`anatomy`** list: the creature's notable functional parts as registry keys (e.g. `["pincers", "walking-legs", "antennae"]`). Motivation: in the blind test, all three context-free analysts could only discover the Graviclaw's pincers through ability `instrument` fields — the strongest anatomical evidence lived in the wrong block, and `bodyPlan: multiped` carries no appendage inventory. Two commitments: (1) a **full anatomy deep dive** to build a comprehensive parts vocabulary (Nick believed this existed already; it does not — the 25-instrument list was built for abilities, not as a body inventory); (2) an authoring/validation rule that **every physical instrument a species declares must appear in its anatomy** (non-physical instruments like `mind` validate against senses/traits instead). Open design question for the deep dive: whether anatomy keys and instrument keys are one vocabulary (instruments ⊆ anatomy) or two linked ones.

**ANATOMY DEEP DIVE COMPLETE — SYSTEM RATIFIED 2026-09-01** (full detail + cut ledger: `xalian-catalog/anatomy-consolidated.md`; harvests in `anatomy-harvest-*.md` + `anatomy-demand-sweep.md`). Structural decisions D1–D5 all ratified: (D1) ONE vocabulary + innate channels — the anatomy registry IS the physical-instrument vocabulary; an ability's `instrument` is either an anatomy key (must appear in species `anatomy`) or one of SEVEN innate channels; the old 25-instrument list dissolves into these pools. (D2) Keys are functional, never material — composition/covering carry material (stone fists = `fists`, crystal growths = `spines`, vines = `tendrils`, energy sickles = `blades`). (D3) Parts, not effects or capacities. (D4) Formless bodies stay armed: `body` catch-all, `coils` serpentine, shared `pseudopods` for amorphous/gas/energy/spectral; swarm = bodyPlan + channel. (D5) Only `antennae` is a dual sense-and-act key. **34 anatomy keys:** jaws, fangs, beak, tusks, horns, antlers, trunk, tongue, crest, lure · claws, talons, fists, hooves, pincers, blades, spurs, wings · tail, stinger, rattle, coils · hide, shell, spines · tendrils, roots, pseudopods · spinnerets, light-organs, vents, core · antennae · body. **7 innate channels + predicates:** mind (psychic element/sense or telekinetic/hypnotic guaranteed), gaze (sight > 0 + declared), voice (communication contains vocal), breath (`breathes` non-empty), secretion (declared, lore-justified), swarm (bodyPlan = swarm), aura (declared, lore-justified — RESTORED by Nick's exhaustive-first ruling after Claude proposed cutting for zero demand; lure/core/talons/hooves kept by the same principle). **No spellcasting canon note:** Xalians have no generic magic; every projected power decomposes into a channel or emitter key (willed→mind, radiated→aura, expelled→breath/secretion, emitted→crest/light-organs/core, discharged→body) — forced specificity is a feature. **Allowed-actions matrix ratified** (in anatomy-consolidated.md) for all 41 instruments; cut/stab/slash deliberately fold into the coarse 16-action grain (stab/gore/impale = strike; slash/cut/tear = rake) with specificity carried by catalog names; `mend` reachable via secretion/aura/mind/light-organs so healing species always have a path; `body`'s wide set makes it the universal-eligible fallback (dissolves the no-eligible-instrument failure mode). Coverage verified for all 29 species; 5 need authored anatomy at migration (Smokat, Newtapede, Luceras, Figzy, Akinza). **Audit-2 fixes (ratified 2026-09-01):** anatomy is **species-fixed** — individuals never roll different body parts; every record inherits the species anatomy exactly (keeps instrument validation clean). Scope definition: anatomy lists **external functional parts relevant to action**, never internal organs (consistent with "breathing mechanism is never record data"; the blind trio couldn't tell whether the list was exhaustive). Species-authoring constraint: a species' `manipulation` band may reach high values only when the means is guaranteed (grasping anatomy, or `telekinetic` in the guaranteed traits); species with `telekinetic` only in the rolled pool keep modest manipulation bands (closes the rolled-high-manipulation-with-no-means incoherence).

**Reality-breaking powers — closing principle (ratified 2026-08-30).** Teleportation, invisibility, puppeting, time reversal, creating life, and permanent transformation do not exist as generic capabilities; their bounded look-alikes live in traits and abilities, and one-off exceptions are hand-authored signature abilities where the blast radius is controlled. The five rulings:

1. **Invisibility**: not its own concept; true invisibility is the top of the `stealthy` scale (voidcloak light-bending, camouflage are planet flavor). Nothing is ever mechanically undetectable, so `perceptive` always matters.
2. **Mind control**: `hypnotic` caps at entrancing/dulling. Puppeting (moving another's body) and possession do not exist generically; a species that warrants it gets a hand-authored signature.
3. **Time manipulation**: perceptual and local only (`foresighted`, slowing perception, aging a small area). Nothing rewinds or undoes; no game or story event reverses.
4. **Self-replication and summoning**: only Generators create life — the scarcity premise of the whole setting. No creature spawns, clones, or births combatants. Tetrahive's familiars are extensions of its own body and mind, not new creatures; all future summon-flavored kit uses the same hedge (projections of self, never new life).
5. **Size and shape change**: height/weight are fixed in the immutable record. Temporary shifting (smoke form, ice bulk) is ability/signature space and reverts. Shapeshifting into other creatures is banned outright; appearance mimicry is signature-space at most.

**Intelligence & speech canon (ratified 2026-08-31, Graviclaw pilot).** Xalian intelligence spans octopus-to-near-human; **no species speaks languages** and no species template bands intelligence into true human range. Command-following is explained by engineering, not speech: Xalians were built as a labor force, so comprehension of instruction was a design requirement of every Generator's output — they understand, they do not speak. `vocal` in the communication enum means calls and cries, never words; `signaling` (claw percussion, posture, light patterns) is the mute-but-clever species' channel; `telepathic` species push feeling, not words. Charisma is unaffected: it is presence, not eloquence. This lives in source-canon documents for now (lore-voice `references/canon.md` continuity constraints); public-facing lore surfaces it organically later, never as an announcement.

**Genome chirality marker (ratified 2026-09-01).** `physiology.genome: { "chirality": "levo" | "dextro" | "achiral" }` — a vestigial, deliberately gender-free dimorphism marker. Lore cover (internal): the original template library carried both chiralities for its two production lines; sexless output was monopoly protection by a sterile race (creatures that breed break the Generator business model), anatomy expression was disabled by decree, and the marker persisted because revalidating every template was a cost nobody would approve. Rolled 50/50; `achiral` is **species-declared** (e.g. non-corporeal), never a random roll. Rules: the site never displays or maps it to gender; no ordering or rank is implied (chirality chosen precisely because handedness has none); community gender-association is accepted and unendorsed. **Implementation docs must explain the word** — chirality is obscure: define it (molecular handedness, left/right helix twist), state that it carries no rank or meaning in current games, and describe how a future game could map it (dimorphic display, breeding-adjacent mechanics in some non-canon mode, cosmetic variants). Must ship in generatorVersion 1.0.0 — a marker only newer creatures carry breaks the vestigial fiction. `manipulation` clarification same day: stays a single outcome-based capability (how well it handles objects); the means (physical vs telekinetic) is derivable from `anatomy` + the `telekinetic` trait, so no split.

**Size authoring rule (ratified 2026-08-31).** Nick's original heights/weights are the *relative* gauge between species (he researched comparables, e.g. horse for Graviclaw); Claude proposes realistic absolute numbers per species during migration, adjusting up or down for anatomical plausibility (Graviclaw: height 165–215 cm kept, weight raised from ~211 kg canon to a 280–420 kg band — heavy chitin on a compact frame; mass is part of the immovability story). This applies to essentially all stats during migration; only the lore descriptions are fixed inputs.

**No teleportation (ratified 2026-08-30, Nick's ruling).** There is no first-class teleport concept anywhere in the system, and canonically nothing in Xalia truly teleports: instantaneous transport of matter does not exist, only information (the QED). Apparent teleportation is always one of two things already in the data: intangibility (`phasing` — Smokat, Ectoghoul) or extreme speed (attributes + signature ability — Chromocat's photonic state, which still goes around walls, not through them). Distance stays expensive, which the setting's economy depends on. Species templates set bands per aptitude (Tetrahive flight 7–9; Dromeus flight 2–4 — the "temporary launch" its lore describes; Xylum burrow 6–8). Games threshold or scale these independently (the duel derives Airborne at flight ≥ 6; a racing game scales sprint continuously; a future exploration game gates areas on swim/climb). Height/weight roll around species norms with **wide, deliberately dramatic bands across species** (tiny scouts to colossal Neph-class) — size is both a collectible measurable and usable game input. Lore support: each planet's writeup gains a short **"Biomes & fauna"** block (3–5 sentences: terrain, what locomotion/survival niches it rewards) that grounds each planet's aptitude tendencies and trait pool.

## 8. Abilities (replaces moves entirely)

The old random-corpus moves ("Crazy Hammer Smack") were game artifacts stored in the creature with no grounding in its nature — the last violation of the describe-nature/derive-rules principle. They are replaced by **abilities**: lore-grounded capabilities composed from a grammar, so every generated ability is automatically plausible for the creature that carries it. An ability is `{name, signature, instrument, action, medium, intensity 1–10}`.

**RENAMED 2026-08-31 (Nick's ruling): the ability field "archetype" is now `action`** — in gaming vernacular archetype means class/role (our *build* concept), so the word was on the wrong concept and is removed from the schema entirely. Everywhere below and in the grammar draft, "archetype" = `action`; keys and content unchanged.

### 8a. The grammar (static content tables, hand-authored once at design time)

1. **Archetype table** (~12 rows, the universal action vocabulary games interpret — like traits): `strike`, `lash`, `crush`, `rake`, `burst`, `beam`, `cloud`, `ward`, `snare`, `mend`, `ambush`, `terrorize`. Each row carries its naming word pool (nouns/verbs) and a delivery class (melee/projectile/aura/field) for games that want it.
2. **Instrument vocabulary** (~20–30 entries shared across all species): what performs the ability — physical (`tail`, `jaws`, `talons`, `wings`, `horns`, `tendrils`, `body`) and innate (`gaze`, `voice`, `aura`, `mind`, `hide`, `secretion`, `swarm`). Each instrument's row lists its **allowed archetypes** (e.g. `tail` → strike/lash/snare/ward; `gaze` → beam/snare/terrorize; `spores`-like secretions → cloud/mend/snare). Invalid combinations simply don't exist in the table — this is the no-nonsense guarantee.
3. **Element medium table**: per element, adjective/noun word pools per archetype (Fire: "Molten", "Cinder-"; Dark: "Graving", "Void-"). This is the existing element-filtered qualifier corpus, reorganized.
4. **Name templates**: a handful of fill patterns (`{mediumAdj} {instrument} {archetypeNoun}`, `{archetypeVerb} of the {mediumNoun}`, ...).

### 8b. Species authoring

Each species template declares **1–3 instruments** (mostly 1–2 — one physical instrument justified by its description plus often one innate; species without attack limbs lean on innate instruments and the non-damage archetypes) and **one hand-authored signature ability** — its lore-defining act (Neph's Benthane vent, Tetrahive's swarm command). Every individual of the species carries the signature; it is the species-identity anchor for collectors.

### 8c. Mint-time assembly (zero AI — pure table lookups + PRNG draws)

For each of 2–3 rolled abilities: draw instrument from the species list → draw archetype from that instrument's allowed set (element-weighted) → pick medium (primary element, or a rolled secondary affinity — which makes the affinity *visible* in the ability list) → roll intensity → fill a name template with words drawn from the tables. Deterministic and reproducible from the seed. Duplicate ability names across creatures are expected and good (shared names enable comparison: "my Molten Talon Rake is intensity 9").

Variety math: instrument count per species is deliberately small; per-creature variance comes from downstream combinations (2 instruments × ~3–5 valid archetypes each × 1–2 mediums × intensity ≈ 15–20 rollable abilities per species, of which an individual holds 2–3 plus the signature), and collection-wide variety comes from the instrument vocabulary being spread across the whole roster.

Games derive mechanics from the structured fields (the duel maps archetype/delivery → attack shape and range, intensity → damage rating; `ward`/`mend`/`snare` become non-damage actions). Rare archetype/instrument/medium combinations are a rarity axis.

## 9. Generation pipeline

`expand(seed, generatorVersion, mintOrigin)`:

1. **Species roll** — weighted over the species whose `mintablePlanets` includes `mintOrigin`. Weights per species (commons vs. rares per Generator).
2. **Build roll** — CONCEPT RATIFIED 2026-08-31; further ratified same day: renamed from "archetype" to **`build`** (kills the collision with ability archetypes; stored player-facing: `"build": "warden"`); **every attribute must be favored by at least one build** (the charisma/instinct gap rule — otherwise those fantasies can never mint); **favored-only skew** (favored attributes roll toward band tops; nothing is suppressed — "you shouldn't punish", Nick; flawed individuals emerge from natural band-bottom rolls); skew strength tuned later via **simulated mint batches eyeballed together before first mint** (same session as affinity tuning). **Roster RATIFIED 2026-08-31** (wording corrected per audit-2, 2026-09-01: every **shaped** archetype favors exactly two attributes; `balanced` is the explicit zero-favor exception and stores `favors: []` — 15 shaped × 2 = 30 assignments = 10 attributes × 3, the math Codex twice misread as impossible) — 15 builds + `balanced`, every attribute favored by exactly 3 builds (equal coverage was Nick's requirement; 15 is the forced size at 2 favors/build). Final keys (definition-audited; misfits sentinel/warden/paragon/alpha/trickster/hunter replaced): `vanguard` (str+vit), `juggernaut` (str+res), `berserker` (str+end), `bulwark` (vit+res), `survivor` (vit+end), `stalwart` (res+will), `skirmisher` (agi+reflex), `runner` (agi+end), `prowler` (agi+instinct), `predator` (instinct+reflex; over "hunter" — hunting implies food, predator names the nature), `seeker` (instinct+int), `sage` (int+will), `virtuoso` (int+cha; "paragon" too generic, "bard" comedic), `sovereign` (cha+will; "alpha" pop-culture-contaminated), `rogue` (cha+reflex; class-canon, replaced too-informal "trickster"), `balanced`. Builds ship as registry vocabulary (key + display + favored attributes + one-line tagline); **binder always displays the favored attributes with the name** (Nick's UI ruling: "skirmisher" alone is flavor; "skirmisher — built with high Agility and Reflex" teaches the system). Taglines avoid formulaic repetition. RPG-class sweep confirmed: rogue/berserker/sage are the only class-canon words that name innate natures; the rest are professions/practices (wizard, paladin, bard, assassin...) and were rejected on principle — builds are born leans, not jobs. Graviclaw: `{ stalwart: 5, vanguard: 3, predator: 1 }`. pick a per-individual build identity weighted by species; it correlates the attribute rolls, skewing where they land *within* the species bands so individuals have coherent shapes instead of ten uncorrelated middling dice. **Stored in the record** (Nick's ruling 2026-08-31) — visible binder/collecting language ("a warden-build Graviclaw") and free rarity legibility. Senses stay distinct from aptitudes (ratified same day: aptitudes = what the body does, senses = what it detects; special-sense list is the extension valve — tremorsense is refined touch, echolocation refined hearing; baseline touch/taste grades rejected as undifferentiating).
3. **Attribute rolls** — each of the 10 attributes rolled within the species template's band, skewed by archetype. No global fixed point budget (the old `STAT_COUNT × MAX / 2` scheme is gone); totals vary — roll quality is a rarity axis.
4. **Physiology rolls** — height/weight around species norms; aptitudes within species bands.
5. **Affinity rolls** — chance of no secondary (majority) / one on-graph secondary with graded strength / anomalous off-graph secondary (ultra-rare, sets `anomalous`).
6. **Trait rolls** — each trait in the species pool rolled independently at its own percent (re-ratified 2026-09-02); exclusion partners rolled higher-first; tilts multiply the percent.
7. **Appearance roll** — `finish` from global odds (standard/gleam/prismatic/eclipse; per-species override if declared); variant/pattern/palette reserved.
8. **Ability assembly** — signature ability attached; 2–3 abilities rolled via the §8 grammar (instrument → archetype → medium → intensity → name).
9. **Snapshot** — store the full record with seed, versions, mintOrigin, serial.

### Species template format (authoring contract — must make new species cheap)

```jsonc
{
  "key": "dromeus", "name": "Dromeus", "element": "fire", "homePlanet": "magmuth",
  "mintablePlanets": ["magmuth", "luminax"],       // home-only for lore-locked species
  "bodyPlan": "quadruped-avian",
  "size": { "heightCm": [80, 115], "weightKg": [35, 60] },
  "aptitudes": { "flight": [2,4], "swim": [0,0], "burrow": [0,1], "climb": [3,5], "sprint": [8,10] },
  "attributes": { "strength": [55,80], "agility": [75,95], "...": "bands for all 10" },
  "archetypeWeights": { "skirmisher": 5, "vanguard": 2, "balanced": 1 },
  // affinityOdds omitted = inherit the 75/24/1 baseline (ratified 2026-08-31); declare only as a deliberate lore-justified override
  "traits": { "pool": { "ramming": 70, "pack-bonded": 40, "resistant": 100 } },   // independent percents (re-ratified 2026-09-02); retired draft keys replaced
  "instruments": ["talons", "jaws"],
  "signatureAbility": { "name": "Ignition Sprint", "instrument": "body", "archetype": "ambush", "medium": "fire", "intensity": 8 },
  // no appearance block needed in the common case (global finish odds apply);
  // optional override: "appearanceOdds": { "prismatic": 0.005 }
  "lore": { "description": "...", "biomeNiche": "open volcanic plains sprinter" }
}
```

Existing 29 species migrate by hand-authoring templates from their descriptions and current `statRatings`/`traits` (a one-time, per-species judgment task — good subagent fan-out work). Many more species to be authored with Nick later; the template above is the only thing a new species requires.

### Graviclaw pilot (ratified 2026-08-31 — the migration pattern)

The first full template was drafted for Graviclaw and reviewed by Nick; its corrections became system rules (uniform 0–100 scale, optional-field contract, vocabularies-as-registry-data, guaranteed traits, size authoring rule, no-speech canon — all recorded in their sections). Pilot-specific decisions: instruments `pincers` + `mind`; signature ability = the prey-drag ("Gravity Well", **instrument `pincers`**, archetype `snare`, medium `dark`, intensity 8 — corrected from `mind` after Nick flagged that the lore explicitly pulls prey *to the claw*; migration lesson: classify every ability field against the full description, not the power in isolation); signature format gains a one-line `nature` field for games/binder display (to be formalized in the signature deep-dive); guaranteed `armored` + `anchored`, rolled pool `stealthy`/`lone-stalker`/`telekinetic` at rolledCount [0,1]; `mintablePlanets` home-only (most legacy species will be — they were purpose-designed for one planet; cross-planet species are a new-species-design concern); respiration amphibious, tremorsense, signaling communication. Phenotype entries in all templates stay DRAFT until the phenotype deep-dive lands.

## 10. Rarity model (ratified: hybrid)

No stamped rarity tier in the record. Rarity is **emergent** from independent axes: roll quality (attribute totals vs. species bands), trait draws, affinity strength/anomaly, rare ability combinations, phenotype variant, size extremes, provenance (generator version, serial, mint origin). The binder UI **computes and displays a PSA-style grade** derived from the roll — tier legibility for pack-opening without the record claiming a tier, and since the grade is derived rather than stored, its formula/branding can be revised later without touching any creature.

## 11. Duel derivation sketch (phase 2 — worked example, do not build yet)

Illustrative only, to prove the derivation layer works: HP = f(vitality, resilience); Power = f(strength, ability intensity); Guard = f(resilience, guard-ish traits); movement squares = f(agility); attack range = f(ability archetype/delivery); stamina pool = f(endurance); evasion = f(reflex); Airborne = flight ≥ 6; `spectral` → phase-movement; `anchor` → immune to push + full-speed flag carry; affinity ≥ 50 → dual-type for STAB/effectiveness; `ward`/`mend`/`snare` abilities → non-damage board actions. The duel's current mock-JSON squads get regenerated from the new engine when this phase starts.

## 12. Open questions

1. **Ability grammar authoring** (§8): RATIFIED 2026-08-30 — see `xalian-ability-grammar-draft.md` (same folder): 16 archetypes, 25 instruments (species- and D&D-natural-weapon-validated), element word pools, 4 name templates with intensity-weighted naming. Per-species instruments + signature abilities fold into the species-template migration.
2. **Affinity odds tuning** (§5b): baseline ratified at 75/24/1 (none/secondary/anomalous); secondary-strength distribution and per-species variance still need a tuning pass with simulated batches.
3. **Trait vocabulary ratification** (§6): decided — Nick's edit pass folds into species authoring (trait names reviewed planet-by-planet in the context of real creatures); names stay freely rewordable until first mint, additive-forever after.
4. **Where does the registry live**: decided — content authoring comes first (grammar tables, lore blocks, species templates); the registry/API infrastructure plan (replacing the current DynamoDB tables + Lambda CRUD) is deferred until there's real content to register.
5. **Planet-data redesign (PARKING LOT, added 2026-08-30)**: do for planet data what this doc did for creatures — a full from-scratch pass over the planet record structure (planetRecords.json got a clean-slate schema for reports, but the broader planet data model — climate/terrain codification, how planet demands pair with creature tolerances like the `climate` band, aptitude-tendency data, trait weights — has not had its own deep-dive walkthrough). Triggered by the creature `climate` field needing a planetary counterpart.
5b. **Appearance system (RATIFIED 2026-08-31 — formerly "phenotype")**: Layer 6 is renamed **`appearance`** (Nick's flag: phenotype technically covers height/weight/behavior, which live in other layers, and fails the most-universally-known-word rule; `property` rejected as too generic). Ratified rulings: (a) **staged mix** art strategy — creature art stays the intentional silhouette/logo style (abstract reference, player imagination fills in the rest; possible artist hire much later), so launch appearance variation is **styling overlays applied to the same SVG/image**, never new art; (b) **NOT purely cosmetic as a hard rule** — Nick explicitly declined "never mechanical" to leave the door open for appearance-centered games (Pokemon contest-style: moves performed for aesthetics, not damage); appearance is descriptive data games may read; the guideline that holds: appearance never makes a creature better at anything unrelated to its appearance (no shiny that hits harder); the duel ignores appearance entirely. (c) **Structure**: `appearance.finish` populated at launch from a GLOBAL cross-species vocabulary of renderer treatments (the silhouette style is what makes global-not-per-species possible — zero per-species authoring): `standard` (vast majority) / `gleam` (~1/40, subtle moving sheen) / `prismatic` (~1/400, holographic color cycling) / `eclipse` (~1/4000, inverted silhouette with burning element-color rim). Finishes are element-tinted where color is involved (element colors stay fixed points per the design system). Names and odds freely editable until first mint. `variant` (future per-species drawn morphs), `pattern` (markings overlays), `palette` (within-element shade variation only, if ever — recolors must not break element-color identity) are RESERVED: defined in the schema, omitted per the optional-field contract until real. Species templates need no appearance block in the common case; optional per-species odds override slot (e.g. Luminax skewing prismatic). Future (non-blocking) lore task: in-world explanation of finishes (instinct: expression artifacts of Generator genome decompression, whispered about like misprints).
6. **Signature abilities — RATIFIED 2026-08-31** (all five rules approved by Nick): (1) **baseline-grammar rule**: every signature declares standard grammar fields (instrument, action, medium, intensity) as its guaranteed fallback reading; bespoke perk behavior (Voltish store-and-release, conduit redirection, Chromocat blink) is per-game derivation-layer interpretation keyed to the signature — a game that doesn't know the species runs the baseline and nothing breaks (graceful degradation, same as unknown traits). (2) **Exactly one per species** (identity anchor; schema stays additive if a future species ever demands two). (3) **Intensity is a band in the template, rolled per individual** ("my Gravity Well rolled a 9" — comparison culture + rarity axis; fixed values struck). (4) Hand-authoring may exceed the species' instrument list and even the instrument × action matrix, but must use registry vocabulary (real instruments/actions/mediums) or rule 1 collapses. (5) Authoring guidance: the signature = the species' lore-defining act, sourced from its description first, canon voice via lore-voice, combat-legible, no game mechanics; medium needs element/affinity lore cover. Format: `{name, instrument, action, medium, intensity: [lo,hi], description}`. (6) **Signature NAMING rule (Nick's ruling 2026-08-31, replaces the briefly-proposed catalog-reservation policy):** signature names are written in a GRANDER register than standard catalog names — fancier, more mythic, exempt from the two-word limit — and every signature (new or existing) is checked against the harvested catalog during migration and adjusted if it collides with any standard name. Catalog names stay catalog-plain; signatures read a tier above. Consequence: "Gravity Well" returned to the dark × snare catalog as a standard name, and Graviclaw's signature gets a grander rename at migration (candidate: "Point of No Return" — already signature-register, was cut from the catalog for length, which is exactly the point).
5c. **Blind-record experiment findings (2026-09-01)**: three context-free analysts (Sonnet, Fable, Codex; full logs `xalian-catalog/blind-test-*.md`) analyzed a sample Graviclaw record. The picture test passed (all three reconstructed the ambush-gravity-tank correctly) and the registry's necessity was independently confirmed. Ratified from it: the `anatomy` field + instrument-vs-body validation (§7). Ratified from it 2026-09-01: communication enum split (see §7); specimen-vs-template fix = a schema-contract sentence ("every value in a record describes this individual"), no new field, species view lives in the registry template. Also ratified downstream (2026-09-01): lifespan enum (§7), trait role-noun renames (§6), genome chirality marker (§7), canon **Encyclopedia** (public structured canonCatalog.json seeded from the 63 glossary terms + internal companion file OUTSIDE the shipped bundle since my-app/src/json ships to the browser; nav label "Encyclopedia", masthead candidate "Encyclopedia Xalia"; species get cross-link entries, not duplicates; Claude has free structural reign). Environmental block ratified 2026-09-01 (see §7: `breathes` + `environmentalTolerance`, phase-based media, chemistry delegated to the element matrix). Trait tilt system and explicit-none principle both RATIFIED 2026-09-01 (see §6 tilt tiers and §2 explicit-none). Audit round 2 COMPLETE same day (blind trio rerun on the v2 record: round-1 fixes held, no new structural gaps, logs `xalian-catalog/blind-test2-*.md`; Codex design audit `CODEX-AUDIT-FINDINGS-2.md`, 43 findings). Nick approved all nine fix-now items 2026-09-01, all folded into their sections: drowning rule guarded on non-empty `breathes`, `breathes` ⊆ `ambientMedia` invariant, media enum as versioned registry vocabulary, chemical-exposure wording (matrix-priced, never automatic immunity), unmodeled dimensions = "not modeled" not "unlimited" (all §7 environmental); anatomy species-fixed + external-functional-parts scope + manipulation-band means constraint (§7 anatomy); balanced = explicit zero-favor exception (§9); ability intensity 1–100 + closed-set/open-list corollary (§2); phasing tilt input defined (§6). Rejected: chirality-in-1.0.0 warning (moot, nothing issued) and removing chirality (contradicts Nick's future-proofing ruling). The remaining ~30 findings are registry/implementation-spec requirements parked in the same bucket as audit 1's (bit-exact generation spec, signing, content-addressed manifests, abilityId/signatureId, tilt formulas + Monte Carlo gates, coverage-over-realizable-states, heft weighting curves, errata layer, field-requiredness schema table, linter-as-gate).
6. **Lore writing tasks**: decided — Claude drafts (using the `/lore-voice` skill), Nick reviews before anything enters `planets.json`; scope: per-planet "Biomes & fauna" blocks + a reinforcing sentence for each element's mechanical fantasy (mainly Grimedes = gravity/void/time); Scrambler/Generator minting canon already fits as-is.

## External audit (Codex, 2026-08-31) — dispositions

Second-opinion audit run at Nick's request (25 findings, saved in `xalian-catalog/CODEX-AUDIT-FINDINGS.md`). Dispositions agreed with Nick pending his rulings below:

**Accepted, fix now:** instrument tags must use registry keys/defined instrument GROUPS, never prose (consolidated-dark's "grasping limbs" tags to be normalized); coverage claims only ever come from the automated checker over machine-readable data, never from approximate counts; a mechanical linter (word count, punctuation, banned vocabulary, duplicate detection, competitor-name similarity against a built corpus of existing-game move names) gates every catalog artifact; catalog entries gain an explicit `heft` field so intensity-weighted naming is machine-readable, plus stable `abilityId`/`signatureId` keys; name collision checks run against an append-only global namespace across all published versions; a medium-ownership matrix + literal-vs-metaphor rule gets written so definition-audit calls are consistent (the Umbral Pall / Supernova class of judgment).

**Accepted, registry-implementation-phase spec requirements (new parking-lot item):** bit-exact generation spec (canonical PRNG, domain-separated streams, rounding, golden seed fixtures); generatorVersion as a content-addressed manifest (hashes of algorithm + every registry table) with archival guarantee; record signing/hashing (provenance as proof, serial namespaces); complete ability-assembly probability tree (counts, duplicate handling, empty-pool fallback); exact distribution formulas for tilt/affinity strength/trait counts/temperament weighting with Monte Carlo acceptance tests; whole-record validation invariants (height/weight coherence, climate bounds, respiration×corporeality, flight×physiology); trait set semantics (dedupe, max counts, guaranteed∩rolled); signed external errata layer (invalidation/correction WITHOUT record mutation — the escape hatch that keeps balance-never-touches-records honest); anomalous-affinity reachability included in the coverage checker (an anomalous secondary makes any medium reachable — either the full grid is stocked before first generation or anomalous mediums are excluded from composed abilities: NICK TO RULE eventually); registry vocabulary entries get normative semantics + anchor examples + conformance fixtures beyond the one-line nature.

**Disputed/clarified:** the "16 archetypes × 2 = 32 ≠ 30" math finding is a brief-wording artifact (15 shaped archetypes × 2 = 30 = 10 × 3; `balanced` favors none — design is consistent; validator will encode the invariant); primary-at-100 in affinities stays (deliberate ratified trade-off) though cardinality/anomalous semantics get specified; one-cell-per-name stays (action is already authoritative structured data in the record; the rule is a player-clarity choice, not an inference mechanism); temperament-never-power is reclassified as derivation guidance, not an enforceable contract term; full per-word bibliographies for harvests rejected as overkill (the competitor-name corpus + linter + Nick review covers the real risk).

**Ruled by Nick (2026-08-31):** (1) **intensity rescaled to 0-100** — full uniformity, no exemptions ("make it one hundred and be consistent"); ability intensity, signature intensity bands, and catalog minIntensity/heft thresholds all move to the 0-100 scale (Gravity Well band [6,9] → [60,90]); (2) **Smothering Darkness stays** in dark terrorize, justified as void-is-absence-of-light (darkness-as-void is dark's register; shadow-as-specter remains ghost's) — justification to be encoded in the medium-ownership matrix.

## Next steps

1. Nick reviews this doc — especially Assumptions #8–10 and the open questions.
2. Ratify attribute keys and first trait vocabulary (edits welcome; keys freeze at first mint).
3. Author the species-template migration for the existing 29 species.
4. Write the "Biomes & fauna" lore blocks.
5. Separate plan: registry/API implementation. Then phase 2: duel derivation layer.
