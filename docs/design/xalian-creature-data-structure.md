# The Xalian Creature Data Structure — Handoff Reference

Purpose: a self-contained description of the ratified Xalians creature data system, written so a fresh conversation can brainstorm new games on top of it without any prior session context. Everything here is ratified design as of 2026-09-01 unless marked in-progress. The authoritative long-form design doc is `docs/design/xalian-creature-system-redesign.md`; this file is the condensed consumer-facing view.

## 1. Core philosophy

**Creatures describe nature; games derive rules.** A Xalian's record contains zero game mechanics — no HP, no damage, no cooldowns. It is a rich, structured description of what the creature IS: its body, senses, elemental identity, personality tilt, and what it can do in narrative terms. Every game (the Duel tactics game, or any new one) writes its own **derivation layer** that reads the record and computes that game's stats from it. Two games can read the same creature completely differently, and balance problems are always fixed in a game's derivation layer, never by editing records.

**Records are immutable and deterministic.** A creature is generated once from a random 128-bit seed plus a pinned `generatorVersion`, and the full expanded record is stored forever. The same seed + version always reproduces the same creature (verifiable), and new generator versions only affect new generations — existing creatures never change under their owners. Lore framing: seeds are the encrypted genomes inside Scrambler Tokens, printed by the Mercurius Machine and won in arena tournaments; a planet's Xalian Generator expands the token into a living creature. (The project's old NFT framing is dead; this is a conventional registry/API, and the word "mint" is banned — it's "generate.")

**Species are templates; individuals are rolls.** Each species defines fixed facts (anatomy, body plan, lifespan, its trait pool with per-trait percents, its signature ability, stat/size bands) and every individual rolls within those bands. Every value in a record describes THIS individual, not the species average.

## 2. The record

Six layers in generation order, most-permanent first. Worked example (Graviclaw, the pilot species — a dark-element armored crab-like predator from Grimedes):

```jsonc
{
  "id": "xal_01J8...",
  "species": "graviclaw",

  "provenance": {
    "seed": "7f3a9c...",              // 128-bit Scrambler Token genome
    "generatorVersion": "1.0.0",      // pins the ENTIRE content-table snapshot; frozen forever
    "schemaVersion": "1.0.0",
    "generatedAt": "2026-09-14T...",
    "origin": "grimedes",             // which planet's Generator expanded the token
    "serial": 213                     // Nth of this species ever generated
  },

  "physiology": {
    "corporeality": "corporeal",                    // vs incorporeal (ghost Xalians of Phantiri)
    "composition": { "primary": "flesh" },          // secondary omitted when N/A
    "bodyPlan": "multiped",
    "anatomy": ["pincers", "walking-legs"],         // registry-keyed external functional parts; species-fixed
    "covering": "chitin",
    "heightCm": 198, "weightKg": 372,               // rolled within species bands
    "lifespan": "enduring",                         // fleeting|short|standard|long|enduring|ageless — species-set, never years (bodies wear out, they don't age; ageless is still killable)
    "genome": { "chirality": "dextro" },            // levo|dextro rolled 50/50; achiral species-declared; a vestigial genome marker, NEVER mapped to or displayed as gender
    "diet": "carnivore",
    "communication": ["vibration"],                 // vocal|vibration|display|chemical|telepathic; [] = explicitly mute
    "breathes": ["gas", "liquid"],                  // phase list; [] = non-breather; invariant: breathes ⊆ ambientMedia
    "environmentalTolerance": {
      "ambientMedia": ["gas", "liquid"],            // gas|liquid|vacuum — phases the body tolerates being surrounded by; WHAT a liquid is made of is the element type matrix's job (a Drainov acid swamp = liquid medium + Chemical-type exposure, priced by games via the matrix, never automatic immunity)
      "temperatureC": { "min": -15, "max": 20 }     // sustained normal activity range; a measurement, not a graded value
    },
    "capabilities": {                               // closed set, always present, rolled 0–100 in species bands; 0 = explicitly cannot
      "flight": 0, "swim": 52, "burrow": 31, "climb": 18,
      "sprint": 12, "leap": 4, "manipulation": 44
    },
    "senses": { "sight": 55, "hearing": 28, "smell": 47, "special": ["tremorsense"] }
  },

  "archetype": { "key": "stalwart", "favors": ["resilience", "willpower"] },  // per-individual stat-skew roll; species weight the roster of 16 keys; "balanced" stores favors: []

  "attributes": {                                   // the 10 universal frozen attributes, 0–100
    "strength": 74, "vitality": 61, "endurance": 65, "agility": 14, "reflex": 38,
    "intelligence": 42, "willpower": 78, "instinct": 71, "charisma": 19, "resilience": 93
  },

  "element": {
    "primary": "dark",
    "affinities": { "dark": 100, "ghost": 44 }      // primary duplicated at 100 on purpose; secondary is graded, drawn from the planet's adjacency graph (75% none / 25% on-graph; no off-graph anomalies)
  },

  "traits": {
    "keys": ["armored", "anchored", "stealthy"]   // RATIFIED 2026-09-02: the traits that landed; each was rolled independently at the percent in the species template (all 24 traits, 0 to 100) pinned by generatorVersion
  },

  "temperament": {                                  // 5 axes 0–100, rolled LAST, tilted by the rolled body (body-first causality); games derive BEHAVIOR from these, never power
    "boldness": 81, "curiosity": 48, "energy": 25, "aggression": 66, "sociability": 22
  },

  "appearance": { "finish": "gleam" },              // global rarity overlay: standard / gleam ~1/40 / prismatic ~1/400 / eclipse ~1/4000; cosmetic by default (appearance may matter in appearance-shaped games, never at non-appearance tasks)

  "abilities": [                                    // open list, required, never empty; intensity 1–100 (presence asserts the act exists)
    { "name": "Point of No Return", "signature": true, "instrument": "pincers", "action": "snare",
      "medium": "dark", "intensity": 74,
      "description": "Collapses gravitational waves into a point inside its open claw, dragging prey toward the closing pincer." },
    { "name": "Wraith Vise", "signature": false, "instrument": "pincers", "action": "crush", "medium": "ghost", "intensity": 48 },
    { "name": "Null Grasp", "signature": false, "instrument": "mind", "action": "snare", "medium": "dark", "intensity": 33 }
  ]
}
```

## 3. The contracts every consumer relies on

**Uniform 0–100 scale.** Every graded value in the record (attributes, capabilities, graded senses, ability intensity, temperament, affinities) is 0–100. Thresholds are how games make coarse calls (Duel example: airborne = flight ≥ 60). Exact ties are broken by games via attributes.

**Explicit-none principle.** Universal dimensions (questions every creature has an answer to: communication, diet, breathes, lifespan, capabilities) are ALWAYS present, with "nothing" stated explicitly — `communication: []` means mute, `breathes: []` means non-breather, `flight: 0` means cannot fly. Additive extras (composition.secondary, special senses, rolled traits, reserved appearance fields) are omitted when absent. Corollary: closed sets grade absence with 0; open lists (abilities, rolled traits) express absence by omission, and an entry's presence asserts existence (so ability intensity is 1–100, never 0).

**Optional-field contract.** Absent means "not applicable," never null, never empty string. Unknown fields and unknown registry keys are ignorable — games must not break on vocabulary additions.

**generatorVersion pins everything.** No field is ever resolved against "current" vocabulary; the version names an exact frozen snapshot of every content table (registries, name catalogs, odds). Unmodeled dimensions are "not modeled," never "unlimited."

## 4. The registry (what ships alongside the schema)

Every controlled vocabulary is machine-readable registry data — key + display name + one-line nature description — published with the schema. One canonical definition per key; games build their interpretation tables from these files and human docs are generated from the same data. The registries:

- **Attributes (10, frozen):** strength, vitality, endurance, agility, reflex, intelligence, willpower, instinct, charisma, resilience. Named by the plain-word rule (most universally known word).
- **Elements (14)**, each with a crisp mechanical fantasy (e.g. DARK = gravity/void/bounded time-dilation, never spooky-shadow — that's ghost's turf; WATER = the liquid medium itself plus the galaxy's healing register). Plus the **14×14 type effectiveness matrix** (multipliers 0/0.5/1/1.5/2) and a **per-planet element adjacency graph** governing which secondary affinities are lore-plausible.
- **Anatomy (34 keys + 7 innate channels).** One vocabulary of external functional parts: jaws fangs beak tusks horns antlers trunk tongue crest lure / claws talons fists hooves pincers blades spurs wings / tail stinger rattle coils / hide shell spines / tendrils roots pseudopods / spinnerets light-organs vents core / antennae / body. Keys are functional never material (composition/covering carry material). The 7 channels are innate non-part instruments with predicates: mind, gaze, voice (requires vocal communication), breath (requires breathes non-empty), secretion, swarm (bodyPlan), aura. A ratified allowed-actions matrix maps all 41 instruments to the actions they can perform; `body` is the universal fallback. No spellcasting exists — every projection decomposes into channels/emitters.
- **Actions (16):** strike, lash, crush, rake, shove, drain, ambush, beam, hurl, spray, burst, cloud, snare, ward, mend, terrorize. Coarse-grain on purpose: stab/gore/impale are strike, slash/cut/tear are rake — names carry texture, the action key carries mechanics.
- **Traits (24 generic keys)** with modes (passive|reactive), e.g. armored, anchored, stealthy, phasing, regenerative, healing, protective, pack-bonded, solitary, ramming, hypnotic, mind-sealed. Planets weight the pools; species declare guaranteed traits their bodies demand. A ratified tilt system makes rolled bodies tilt trait odds (stealthy tilts small-mass, phasing tilts high ghost affinity, etc.) — honest causal correlates only.
- **Archetypes (16):** vanguard, juggernaut, berserker, bulwark, survivor, stalwart, skirmisher, runner, prowler, predator, seeker, sage, virtuoso, sovereign, rogue, balanced — each favoring exactly 3 attributes (skew-only, never punishing; every attribute appears in exactly 3 archetypes).
- **The ability-name catalog** (in progress, water complete): names live in cells keyed by action × element medium, deliberately near-exhaustive so move names feel semi-unique across creatures (the Pokemon shared-move model is explicitly rejected). Water's cell holds 1,068 names; 1,142 element-neutral names sit in shared per-action pools; every anatomy-evoking name carries instrument tags so generation can filter by the creature's actual body. Signature abilities use a grander register exempt from the 2-word catalog limit and are hand-authored per species (exactly one each, collision-checked, always the lore-defining act).

## 5. How a new game consumes this

The pattern (worked partially for the Duel game, phase 2):

1. **Read the registries for the pinned generatorVersion**, build your interpretation tables, ignore unknown keys.
2. **Derive your stats from the record.** Examples of the intended texture: HP from vitality+resilience; movement class from capabilities thresholds (flight ≥ 60 = airborne, swim bands = aquatic tiers); action legality from anatomy + the allowed-actions matrix; accuracy/initiative from reflex/instinct/senses; drowning = breathes is non-empty AND submerged in a medium not in breathes; hazard pricing from ambientMedia + temperature bands + typed exposure through the element matrix; AI/behavior color from temperament (never power from temperament — that's a hard rule); social/recruitment/shop flavor from charisma and communication channels.
3. **Abilities are your verbs.** Each ability gives you instrument (what body part or channel does it), action (one of 16 mechanical archetypes — you decide what "snare" means in your game), medium (element for typing), intensity (1–100 magnitude), and a unique-feeling name. The signature ability may additionally get bespoke per-game behavior keyed to its name, but must always have a sane baseline reading through the plain grammar.
4. **Never write to records.** A separate append-only history layer (deferred) will let games report milestones; games may write events but can never depend on reading them.

## 6. World context (one paragraph)

14 planets, one per element, each with a written history; 29 canon species today (2–3 per planet) with more planned; the lore engine is hyper-capitalist tragedy — the extinct Vallerii built Xalian Generators to bioengineer workforces, the AI APEX weaponized them, and the present day is arena tournaments for Scrambler Tokens to repopulate dying homeworlds. A public Encyclopedia (canon catalog seeded from the 63-term glossary) is approved and queued. Species are being migrated to this record system after the name catalog completes; the Duel prototype still runs on the legacy 8-stat system until its derivation layer is built.

## 7. Where things live

- Master design doc (all rulings, trait tables, tilt tiers, pipeline): `docs/design/xalian-creature-system-redesign.md`
- Anatomy system + allowed-actions matrix: `docs/ability-catalog/anatomy-consolidated.md`
- Name catalogs + harvests + composition briefs: `docs/ability-catalog/` on the repo branch `data/ability-catalog` (single home; the old plans-folder working copies were merged in and deleted 2026-09-01)
- Legacy game data for contrast (species.json, elements.json, type matrix): `lambda/src/json/` in the Xalians repo
