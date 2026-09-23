# Reclamation on creature schema v5

Status: plan, written 2026-09-21, before any code. Nick asked for both the one-to-one conversions and the considerations around the parts of v5 that had no v4 equivalent. This document is the second half of `creature-model-current.md` item 6 ("Separate game work: adapt games to v5 after this ability-design work"), for Reclamation only.

Everything numeric below was measured against the frozen release `generation-0.6.0-1` (32 species, generator 0.6.0, schema 5.0.0), not estimated from the schema.

## The measurement that sizes the job

200 v5 records were generated across all 32 species and fed to the game's existing adapter, `packages/rules/src/expedition/recordReading.ts`:

| | reading |
|---|---|
| creatures the game can field | **0 of 200** |
| actions the game can express | **0 of 800** |
| reason given, 800 times | `does something this Proving does not model (undefined)` |

The game would show an empty roster. That is the seam behaving exactly as designed: pass 7 built `recordReading.ts` as the single place every capability question is answered, and Nick's standing ruling is that an unsupported capability is *explicitly unavailable* rather than silently misread. It failed loudly and in one file rather than quietly producing wrong numbers everywhere.

The `undefined` in that message is itself the diagnosis: the adapter reads `effect.kind`, and v5 effects carry `type`.

## What v5 actually contains

Measured over the same 200 records (800 actions, 31 passives):

```
effectTypes   : harm=546, status=201, displace=35, protect=33, restore=31, remove=21
deliveries    : contact=516, stream=82, signal=77, projectile=43, self=37, field=34, pulse=11
ranges        : contact=516, short=122, medium=118, (none)=37, long=7
harmMechanisms: impact=195, piercing=157, cutting=84, elemental=71, compression=39
statuses      : entranced=33, corroding=27, restrained=26, paralyzed=16, frozen=14,
                shielded=12, frightened=11, chilled=10, poisoned=10, reinforced=8,
                concealed=7, protected=6, dispersed=6, focused=3
areas: 27 of 800 actions | ongoing passives: 25 | triggered passives: 6
```

## Part one: the one-to-one conversions

These are renames and reshapes where v5 says the same thing differently. Each was confirmed present or missing on a real v5 record.

| The game reads | v4 | v5 | Conversion |
|---|---|---|---|
| effect kind | `effect.kind` | `effect.type` | rename; the type set also changed (below) |
| primary effect | `effect.emphasis === 'primary'` | **retired** | v5 has no primary/secondary ordering; `effects[0]` is not privileged |
| whom it touches | `targeting.relation` (scalar) | `targeting[]` (array of `self`/`other`) | `touchesOthers = targeting.includes('other')` |
| element | `element.primary` | `element` (bare string) | unwrap |
| blow size | `ability.intensity` (top level) | `effect.intensity` (per effect) | move the read down one level |
| home ground | `provenance.origin` | `provenance.origin` | **unchanged** |
| strain | `physiology.environmentalTolerance` | same | **unchanged** |
| medium | `physiology.breathes` | same | **unchanged** |
| signature | `isSignatureAbility(ability)` | `record.signature: {type, key}` | compare key against the record's declared signature |

Retired outright, and read by the game today: `record.traits`, `record.archetype`, `physiology.corporeality`, template `instruments`, `conduits`, `actionPool`.

Also changed, and easy to miss: **`generateXalian` takes a third argument now.** v5 requires the caller to supply `origin`, `serial`, `profile` and `generatedAt` ("Validate caller metadata only... Never invent replay inputs"). `roster.ts` calls it with two. This is a call-site change, not a record-shape change, and it throws rather than degrading.

### Effect type mapping

v4 had eleven effect kinds; v5 has six. The game's four table roles (`attack`, `shield`, `mend`, `unsupported`) map cleanly:

| v5 `type` | count | table role | note |
|---|---|---|---|
| `harm` | 546 | attack | `mechanism` is new information the game may use or ignore |
| `protect` | 33 | shield | |
| `restore` | 31 | mend | |
| `displace` | 35 | attack | v4 read displace as an attack too; v5 gives it a `direction` |
| `status` | 201 | **see part two** | the big one, 25% of all effects |
| `remove` | 21 | **see part two** | no v4 equivalent at all |

The three "borrowed" kinds that open item 6 has been tracking (`transfer`, `suppress`, plus `restrain`) are **gone as effect types**. v5 says restraining is `status: restrained`, and draining is harm plus a dependent restoration. So that open item is not implemented, it is **dissolved**: the thing it asked for no longer exists to be modeled, and the same expressiveness arrives as statuses.

## What the conversion alone buys, before any new feature

**Correction to this document's first draft.** It originally presented status handling as though it gated whether the roster was fieldable. That was wrong, and Nick caught it. The game breaks on one rename: the adapter reads `effect.kind` and v5 writes `effect.type`. That alone made all 800 actions unreadable, including the 546 plain `harm` ones that the table has always understood. Statuses had nothing to do with the breakage.

Measured with the field renames applied and **no status layer at all**, over 320 creatures and 1280 actions:

| action shape | count | share |
|---|---|---|
| attack (`harm` / `displace` at another) | 927 | **72.4%** |
| shield (`protect`) | 55 | 4.3% |
| mend (`restore`) | 17 | 1.3% |
| status-only, aimed at another | 217 | 17.0% |
| status-only, self | 50 | 3.9% |
| `remove`-only | 14 | 1.1% |

**78% of actions work immediately and 301 of 320 creatures are fieldable.** The conversion stands on its own; the status layer is additive.

### The 19 creatures the conversion does not reach

Only 5.9% of creatures have no action the current table can express, and they are not spread evenly:

| species | unfieldable | |
|---|---|---|
| **hypnopet** | **20 of 20** | every individual, always |
| thirstaserp | 9 of 20 | |
| yetimoth | 8 of 20 | |
| avilily | 3 of 20 | |

The statuses they carry instead: `entranced` 48, `frozen` 24, `poisoned` 18, `paralyzed` 12, `focused` 12, `shielded` 8.

This is the argument for the status layer being real work rather than polish. Hypnopet's whole identity is therapeutic hypnosis; without a status layer **one canon species can never be played**, in any seed, ever. That is a content hole, not a balance question.

## Part two: the status layer

Nick's ruling, 2026-09-21: **build it.** "If a creature obtains a status as the result of an enemy attacking them, that's something I would like to support."

It is a layer over a working game, not a precondition for one, so it ships after the conversion and is measured separately. What it needs is recorded here; the design of it is its own pass.

- Statuses arrive from an attack's effects and belong to the creature, so the Clash needs somewhere to write them and the Ruling somewhere to read them.
- `persistence` is already stated per effect (`sustained` needs `bound: source | area`, `lingering` carries its own `duration`), so v5 says how long a condition should last and the game does not have to invent it.
- Fourteen statuses appear in the frozen roster. `shielded`, `reinforced`, `protected` and `mending` overlap mechanics the table already has, so they must not be counted twice.
- The bot has to see them or it will play into them.
- Every gauge is measured against a game without conditions and none of the readings transfer.

## Part three: the rest of v5 that v4 had no equivalent for

These are opportunities rather than obligations. Each gets a recommendation; none blocks the conversion.

### 1. `remove` (21 effects) and protection descriptors

An effect that ends another application. **Recommendation: unavailable and stated for the conversion, then revisited as part of the status layer**, which is precisely the "between-rounds condition" that gives `remove` something to act on. Cleansing a burn is meaningless today and meaningful the moment burning persists, so it belongs to that pass rather than this one.

### 2. `harm.mechanism` (impact / cutting / piercing / compression / elemental)

Entirely new. v4 damage was undifferentiated. Five mechanisms with a real spread (impact 195, piercing 157, cutting 84, elemental 71, compression 39).

**Recommendation: read it, do not yet price it.** Record it on the action reading and show it in the inspector, so the dossier says *how* a creature hurts, which is free fiction and free glanceability. Do not make it a damage multiplier in this pass: that is a balance lever and it needs a sweep against the gauges, not a guess bundled into a migration.

This is the single largest *opportunity* in v5, and it deserves its own pass with measurements.

### 3. Ratings are open-ended (no 100 ceiling)

v4 attributes were bounded. v5 says explicitly: "100 is not a ceiling, percentile or physical ratio", values above 100 allowed.

The game's `magnitudeOf()` computes `(intensity / 10) * (0.5 + attr / 100)`, which silently assumes attr is a percentage of 100. **This will not crash; it will quietly inflate.** A creature with attribute 130 gets a 1.8x multiplier where the formula's author expected at most 1.5x.

**Measured before claiming anything.** Over 6,400 attribute readings from 640 records across all 32 species:

```
agility 6..97   charisma 5..84   endurance 25..93   instinct 30..84   intelligence 10..84
reflex 10..94   resilience 12..95   strength 8..95   vitality 20..88   willpower 23..85
readings above 100: 0 of 6400 (0.00%)
effect intensity: 12..95, median 53, p90 72 (n=2195)
```

**No reading exceeds 100 in this release, and the highest is 97.** So the formula's implicit ceiling is a latent risk rather than a live bug, and intensity lands in the same 12..95 band v4 used. **Recommendation: keep the formula, and add a comment stating the measured ceiling and that v5 permits values above it.** Anything above 100 in a future release inflates the multiplier past what the formula's author intended, and the comment is what makes that findable then.

This is a correction to my own first reading of the model doc: "100 is not a ceiling" is a statement about the *schema*, and I had assumed it meant the roster would use the headroom. It does not.

### 4. Four actions exactly, and structural distinctness

v5 guarantees `actions.length === 4`, all structurally distinct. v4 pools varied. Pass 25's act flip measured "every creature carries 3-4 usable acts and 72% can offer two genuinely different behaviours" and built the second decision axis on it.

**v5 makes that guarantee a schema invariant rather than a measured property.** Act flip should get stronger and more uniform. The pass-25 sweep numbers (option spread 7.5 / 5.0 / 3.53 by round) are stated against v4 records and **must be re-measured**; they are not transferable.

### 5. Ongoing vs discrete passives, and triggers

25 ongoing passives and 6 triggered ones in the sample. v5 gives passives real structure: `contact`, `harmed`, `ally-harmed` triggers with a defined target.

v4 passives were read and reported but carried no table rule (13 on 400 records, all `protect`). The Clash now has a genuine hook: `harmed` fires during resolution, and the engine already steps event by event.

**Recommendation: out of scope for the conversion pass, and the most interesting thing v5 opens.** A `harmed` trigger is a retaliation mechanic the Proving could express today without new UI. Worth its own pass after the roster is fieldable.

### 6. Areas are richer

v4 had a boolean-ish `spatial.area`. v5 has shape (line/cone/radial/sweep), extent, anchor and lifetime. The game reads area only as "is this a sweep".

**Recommendation: keep reading it as a boolean this pass.** 27 of 800 actions carry an area, so the sample is thin, and the sweep role already works. Shape and extent are a later geometry question, and the Proving has no board geometry to spend them on.

## Order of work

**Pass A, the conversion.** Makes the game run on v5 and changes nothing else.

1. **The adapter.** `recordReading.ts` reads `effect.type`, `targeting[]`, per-effect `intensity`, bare `element`, and the record's declared `signature`. Target, measured: 301 of 320 creatures fieldable, 78% of actions expressible, and every remaining unavailable reason naming a real status instead of `undefined`.
2. **Call sites that throw.** `roster.ts` and anything else calling `generateXalian` with two arguments now needs replay metadata (`origin`, `serial`, `profile`, `generatedAt`).
3. **Archetype removal.** Measured: `naturalRoleOf` already reads the role off what the actions DO (pass 7), so archetype survives only as a tiebreaker for a support creature carrying both shield and mend, or neither. v5 states the signature explicitly where v4 had to infer it, so the tiebreaker reads better than what it replaces.
4. **Comment the attribute ceiling** with the measured 0-of-6400-above-100 reading, so a future release that uses the headroom is findable.
5. **Re-run every gauge and record the v5 readings as they land, before touching a lever.** Every band on the sheet was set against v4 records and none of them transfer. Measuring first separates "v5 moved this" from "I retuned this"; doing both at once makes the cause unrecoverable.

**Pass B, the status layer.** Ratified by Nick 2026-09-21. Rescues the 19 creatures Pass A cannot field, Hypnopet above all, and is measured against the v5 baseline Pass A establishes rather than against v4's.

**Later, each on its own evidence:** harm mechanisms as a damage consideration, `remove` once conditions persist, passive triggers as a retaliation mechanic, area shape if the board ever gains geometry.

## Pass A: what it measured after the conversion

**The adapter.** 0 of 320 creatures fieldable becomes **302 of 320 (94.4%)**, all 320 signatures found (290 on actions, 30 on passives), and every remaining unavailable reason names a real status rather than `undefined`.

**Two latent bugs schema 5 exposed rather than caused.** The simulator's `--random` policy and the validation tool's naive random policy both advertise "uniformly random among LEGAL actions" and both built their candidate list without checking fieldability. Every schema 4 creature was fieldable so it never fired; under schema 5 about 6% are not, and the match aborted with `illegal deploy action`. Both now gate on `isFieldable`.

**Two collapses caught by measuring rather than by reading the diff.** Removing `archetype` silently flattened two things that no test covered:

| | read without a fix | after |
|---|---|---|
| roles over 96 creatures | 86 strike, 6 sweep, **0 shield, 0 bolster** | 71 strike, 9 bolster, 6 sweep, 6 shield |
| conduct lines over 96 creatures | **96 of 96 `enemySentEarliest`** | 7 distinct lines, spread |

Two of the game's four roles had ceased to exist, and every creature targeted identically. Both are now read from what schema 5 states outright: the role from the record's own **signature** (a creature whose signature shields is a shield), and conduct from **temperament**, whose five axes the frozen roster genuinely uses (49 distinct aggression values over 96 creatures, spanning 15 to 80). Both readings are better than the archetype they replace, because they are about the individual rather than about which of sixteen labels its species carried.

### The gauges, re-measured on v5 before any lever was touched

| Gauge | Band | v4 reading | **v5 reading** |
|---|---|---|---|
| Resolution changes the leader | 25 to 40 | 26.1 / 26.9 / 24.5 | **26.6 / 25.1 / 26.3** |
| Downs per match | 3 to 5 | 4.85 / 4.64 / 4.80 | **5.17 / 5.00 / 5.32** |
| Comeback from a contested round 1 | 30 to 40 | 30.8 / 32.0 / 35.1 | **28.0 / 30.7 / 29.9** |
| Option spread (near-best per decision) | 3 to 5 | 2.85 (v4 pre-act-flip) | **4.6, dominant 25.7%** |
| Naive-policy margin | 8 or more | 13.1 / 13.1 / 14.5 | **12.0** |
| Every role inside keeper win rate | 40 to 60 | shield 46.0, bolster 46.4, sweep 51.4, strike 52.3 | **bolster 45.4, shield 52.5, strike 61.2, sweep 62.8** |

**Five of six gauges are in band and none moved far.** That is a better outcome than expected from a schema replacement, and it is worth saying why: the creature contract changed, but the *shape* of what a creature is — a hold, a blow, a role, a tolerance — did not.

Two readings need stating honestly rather than glossed:

- **Comeback slipped just under the band** (28.0 / 30.7 / 29.9 against 30 to 40). One seed in band, two marginally under. This is a lever question and it is deliberately NOT being retuned in the same pass as the conversion, because retuning now would make it impossible to say later whether v5 moved it or I did.
- **Strike and sweep keeper win rates are over the 40 to 60 band** (61.2 and 62.8). Both blow roles beat both support roles by about ten points. That is a real balance finding from the new roster, and it belongs to a lever pass with its own sweep.

## Open items this pass found and did not fix

1. **Some attacks never reach their figures.** On a still frame during an `attack` event, no figure carries `rec-figure--acting` or `rec-figure--hit`, although `highlights.acting` holds a valid record id and that creature is on the board. Clash frames in motion read 34% on v5 against 99% on v4, with every animation individually working (26px transforms, camera on 92% of frames, flashes appearing, blows visible in a paint check). Two hypotheses were built, measured and rejected: hurrying the empty `lapsed`/`no-target` beats moved it 33% to 34%, and remounting a repeat actor's plate moved it 43 to 47 moving frames. **The clash gauge's floor is lowered to 30% with that reasoning written into the file**, so it still fails if the pass-28 motion work is undone and does not pretend the reading is the target. Restore it to 60% when this is fixed.

2. **Six trait behaviours are inert.** `traits` is retired, so `stealthy`, `armored`, `resilient`, `menacing`, `pack-bonded` and `solitary` are false for every creature (measured: 0 of 96 for all six). Hiding is the visible one: pass 20 measured 16.8% of sends arriving hidden, and it is now 0%. **`armored` has a direct v5 source** (`physiology.protections[]`, carried by 9 of 96 creatures as `harm: resistant`) and the graded `capabilities` could source others; stealth, menace and the pack/solitary bonuses have no v5 equivalent and the model deliberately retired territorial and pack bonuses. Needs a ruling on which to re-source and which to let go.

3. **Strike and sweep sit above the role win-rate band** (61.2 and 62.8 against 40 to 60), and comeback sits marginally under (28.0 / 30.7 / 29.9 against 30 to 40). Both are lever questions, deliberately not retuned in the same pass as the conversion.

## What this does not do

Pass A adds no mechanic. It converts the reading, fixes what the conversion exposed, and records the new gauge readings as they land. The status layer (ratified, Nick 2026-09-21), damage types, retaliation from passive triggers and area geometry are the opportunities v5 opens, each wanting its own measured pass.

## Re-measured on generation-0.7.0-1 (derived acts), 2026-09-22

The creature release under the game changed: ordinary actions are now derived from each species' anatomy (see `creature-derived-acts.md`), so every roster draws different ordinary acts for the same seed. No Reclamation rule or lever moved. Simulator, 300 matches per seed, seeds 7 / 11 / 23:

| Gauge | Band | v5 reading (above) | **0.7.0-1 reading** |
|---|---|---|---|
| Resolution changes the leader | 25 to 40 | 26.6 / 25.1 / 26.3 | **29.7 / 28.3 / 28.5** |
| Downs per match | 3 to 5 | 5.17 / 5.00 / 5.32 | **5.48 / 5.09 / 5.48** |
| Comeback from a contested round 1 | 30 to 40 | 28.0 / 30.7 / 29.9 | **28.0 / 28.9 / 29.0** |
| Strike keeper win rate | 40 to 60 | 61.2 | **60.9 / 59.9 / 59.9** |
| Sweep keeper win rate | 40 to 60 | 62.8 | **54.7 / 57.1 / 56.9** |
| Bolster, shield keeper win rate | 40 to 60 | 45.4, 52.5 | **47.2, 52.5 / 47.4, 52.6 / 43.8, 58.3** |
| Seat A match win rate | about 50 | | 47.7 / 48.3 / 46.7 |

Reading: sweep came back into band (wider bodies now carry real sweeps and fewer duplicated heavy blows), strike sits on the band's edge instead of over it, and resolution matters slightly more. Downs rose a little further above the band and comeback stays just under it; both were already outside before this change and remain the lever pass's items, not this conversion's. The seeds used for the earlier v5 column were not recorded in this doc, so the comparison is between runs, not seed for seed.
