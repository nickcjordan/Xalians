# Creature sample set: synthetic creatures for testing games

## Context

Games on the platform are tuned against the creatures that exist today, but the catalog is still being filled in (Nick, 2026-09-29). Many mechanisms the creature guidelines allow are rare or absent in today's species: across the roughly 1,200 creatures Powerworks can field, no species produces a boost (`stimulated`), heals are 1% of moves and ally shields 2% (`powerworks-pillars.md`, "Speed approved as a pillar"). A game tuned only on today's catalog is tuned on an accident of which species were written first, and the first species that uses a new shape can break its numbers or its screen.

This set gives every game a second body of evidence: synthetic creatures built by the same guidelines and the same generator as real ones, chosen to cover the guideline space on purpose. Games test against both, side by side. The sample creatures are never canon, never offered to players, and never bundled into content.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | Two layers. An **effect grid**: every action shape the schema allows (effect type, mechanism, element, status, recipient, likelihood, timing, intensity points), each a schema-valid resolved action, legal but not necessarily plausible; it answers "does the game read it, and do its numbers hold". **Sample species**: plausible creatures authored as species templates within the guidelines and generated through the real generator; they answer "how does the game play with creatures like this". | 85%, the grid alone is not a creature, and species alone cannot reach every shape cheaply | `packages/content/src/creature/ability.ts` (`ActionSchema`), `packages/rules/src/generator/prototypeCreature.ts` (`createCreatureCatalog`) |
| 2 | Sample species go through the real pipeline (template, `compileSpecies`, derived acts, `generateXalian`), not hand-written records, so they obey every rule a future species will. A template that cannot express a guideline-allowed shape is a finding about the guidelines or the compiler, reported, not worked around. | 85% | [creature-derived-acts.md](creature-derived-acts.md), `packages/content/src/creature/acts.ts`, fixture `packages/content/src/creature/fixtures/support-species.json` |
| 3 | Game-agnostic home: `packages/rules/src/samples/`, exported as `@xalians/rules/samples`, so Powerworks, Reclamation and the duel can all use it. Keys are prefixed `sample-`. Nothing in `packages/content/json` or the generator pool reads it. | 90% | "One source per data kind" (a test fixture is not a data source) |
| 4 | Coverage axes for the species: all 14 elements; roles (single-target striker, area striker, drain, ally healer, self healer, ally shielder, self guard, booster, hinderer and binder, displacer, prolonged charger, status applier, pure support with no attack); attribute profiles (fragile, standard, bulky; slow, fast; including limited ratings near 10 and exceptional near 100); output bands (limited 25, standard 50, strong 75, exceptional 100, and above 100, since intensity has no ceiling). Not a full cross product: every value of every axis appears at least once, and pairs that matter to games (element with role, role with output band) appear often enough to compare. | 75%, the axes are my reading of the guidelines; add an axis when a game meets a shape the set misses | [creature-model-current.md](creature-model-current.md) "Effect fields", "Statuses, intensity and protections"; `benchmarks.ts` `RATING_REFERENCE`, `OUTPUT_BENCHMARKS` |
| 5 | Deterministic: fixed template list and fixed seeds, so every report reproduces. | 95% | |
| 6 | A coverage report is part of the set: which grid shapes and which roles each game reads, parks or ignores, printed by a devtool, so "this mechanism is not exercised" is a line in a table rather than a guess. | 85% | |
| 7 | Games report catalog and samples as separate columns and never merge them into one number; the catalog says how today's creatures play, the samples say how the rules hold. | 90% | |

## Layout

- `packages/rules/src/samples/effectGrid.ts`: `effectGrid()` returns every grid action with a short label of its shape.
- `packages/rules/src/samples/templates.ts`: `sampleTemplates()`, the sample species templates, built from one base template by varying the axes above, each carrying its axes and a one-line `nameOrigin` saying it is a non-canonical sample and which axes it covers. Also exports the axis lists (`SAMPLE_ROLES`, `SAMPLE_PROFILES`, `SAMPLE_BANDS`) and `roleNote`.
- `packages/rules/src/samples/index.ts`: `sampleSpecies()` (compiled), `sampleAxes()`, `sampleCreatures(perSpecies = 3)`, `sampleSquads(n, seed)`, `effectGrid()`. Exported as `@xalians/rules/samples` in `packages/rules/package.json`.
- `packages/rules/src/samples/samples.test.ts`: every grid action passes `ActionSchema`; every template compiles; every generated record passes `CreatureRecordSchema`; the coverage axes are all present; generation is deterministic.
- `packages/rules/src/samples/devtools/coverage.ts`: prints the axis coverage of the generated set. Run with `node apps/web/scripts/runNode.cjs packages/rules/src/samples/devtools/coverage.ts`.

## Using it in a game

A game's measuring tools take a creature source (catalog, samples, or mixed) and print each as its own column. Powerworks is the first consumer: the numbers pass checks its census and difficulty against both ([powerworks-pillars.md](powerworks-pillars.md), "Numbers pass").

## Built

Built 2026-09-29 on `feat/powerworks-numbers`. Nothing outside `packages/rules/src/samples/`, the `./samples` export in `packages/rules/package.json`, and this doc changed; no canon species, content JSON, registry, generator, compiler or schema was touched, and no bundle or catalog reads the samples.

| Layer | Count |
|---|---|
| Grid actions (`effectGrid()`) | 472, all valid under `ActionSchema` |
| Sample species templates | 56 (14 roles by 4 elements each) |
| Generated records | 168 (3 per template, seeds `sample-<key>-<j>`) |

**Grid.** Varied one axis at a time from the standard base, plus paired shapes. It holds: harm with each of the four physical mechanisms across all nine intensity points (1, 5, 10, 18, 25, 50, 75, 100, 150); elemental harm for all 14 elements on a target and on an area, with fire across the whole ladder and fire and water as area harm across the whole ladder; area geometry (radial at every extent and anchor, line, cone and sweep at every extent, lingering and sustained areas); all nine preparation and recovery pairs; all three likelihoods; every delivery mode with its ranges, approach and reception; restore and protect on every recipient across the ladder, with ally-aimed and either-aimed targeting; displace in both directions on every recipient; all 29 statuses on target, self and area; status intensity overrides, durations, all removal methods, and sustained source-bound and area-bound statuses; all six `stimulated` functions; every `protected` descriptor and degree (each physical mechanism, all 14 elemental harms, five statuses, displace); `remove` with each method on every recipient; drain (harm plus dependent self restore) for every mechanism; harm plus a status rider (12 pairings); and support pairs (restore plus cleanse, restore plus stimulated, protect plus shielded, and others).

**Species.** Fixed rotation: role `r`, slot `n` takes element (4r + n) mod 14, output band (r + n) mod 5 and attribute profile (r + 2n) mod 7. Every axis value appears; every element has 4 templates, every role 4, every profile 8, every band 11 or 12. Every role sees four of the five bands and four different profiles.

| Axis | Values |
|---|---|
| Element | all 14, 4 templates each |
| Role | striker, area-striker, drain, ally-healer, self-healer, ally-shielder, self-guard, booster, hinderer, binder, displacer, charger, status-applier, pure-support (hinderer and binder are two roles) |
| Attribute profile | standard, fragile, bulky, slow, fast, minimal (every rating 8 to 12), exceptional (every rating 95 to 105) |
| Output band | 25, 50, 75, 100, 130; the band is the centre of a plus or minus 5 band on the signature's principal effect (the harm, restore, protect or displace intensity, or the status intensity for status roles) |

The role lives in the guaranteed signature action. The other three slots are ordinary acts the body derives, so a healer record usually also carries body strikes; games comparing roles should read the signature (each record's `signature.key`), not assume all four actions serve the role. Output band controls the signature only; ordinary acts follow the attributes, as the derivation tables define.

The generated set covers 18 of the 29 statuses in its actions (missing: overheated, poisoned, frozen, mending, reinforced, protected, focused, concealed, revealed, phased, dispersed); the grid covers all 29. Effect types across the records' actions: harm 310, status 209, displace 94 (toward 2), restore 77, protect 12, remove 6. Full tables come from the devtool.

## Findings

Findings are for Nick to decide. None blocked a role. Each is a shape the guidelines allow but the derivation tables do not produce, so the sample template authors it as a mechanism, or a limit that shaped what the set measures. Nothing was widened to work around them.

1. **Boosters are authored, not derived.** Case: `stimulated` with a function, on an ally (and self). Rule: no instrument row or medium row produces it; only an authored `mechanisms[]` entry can (the rows in `acts.ts` know `bind`, `ward` and a medium `status`, never a function). Effect: every booster template carries an authored mechanism, and no derived body will ever produce a boost, which is why real catalogs show none. Smallest change: give the aura, secretion and mind rows a `boost` pattern that yields `stimulated` with a per-row function; or leave boosts authored-only and accept the rarity.
2. **Ally-aimed protection is authored.** Case: `protect`, or `shielded`, aimed at another body. Rule: `ward` derives self-targeted `shielded` (or the medium's `ward` status) only, while `mend` has both a self and an other form. Smallest change: give `ward` an other form on contact and signal channels, as `mend` has. The samples author it (Shuntara and Figzy do the same).
3. **A sustained hold is authored.** Case: an ongoing action that keeps a target restrained while the performer maintains it. Rule: `snare` derives a lingering hold only, never `persistence: sustained` with `bound: source`. Smallest change: a `hold` pattern on rows with a `bind`, with ongoing continuity. The samples author it on the Shuntara pattern.
4. **A pull (displace toward) is authored and rare.** Case: displace `toward`. Rule: `shove` derives `away` only; no row derives `toward`. Only 2 of the 168 records carry a pull. Smallest change: a `pull` pattern on `tendrils`, `tongue`, `trunk` and `lure`.
5. **Ally cleanse (remove aimed at another) is authored.** Case: `remove` on a target. Rule: no row derives `remove`; the fixture's washing-fluid mechanism is the pattern. Smallest change: a `cleanse` pattern on secretion and aura.
6. **Pure support needs five exclusions.** Case: a species with no attack at all. Rule: every instrument set that supports mend or ward also carries `strike`, `crush`, `shove`, `terrorize` or `snare` through `body`, so the samples exclude `*/strike`, `*/crush`, `*/shove`, `*/terrorize` and `*/snare`. Legal, and a canon species would need a lore reason per exclusion. Smallest change: none required; a support-only body is a subtraction from the tables, not a table entry.
7. **A drain signature caps the same creature's heals.** Case: the signature guardrail collects every restore effect of an action signature, including the dependent self restore of a drain (about 40 percent of its harm), as the cap for the `restore` kind, so an ordinary mend on a drain creature is lowered to the drain's gain. Across the set, derived acts on drain templates were clamped 9 times, the most of any role. Smallest change: leave effects with `requires` out of `signatureCaps`, or cap them separately. Nick decides whether a drainer's heal should sit at its drain gain.
8. **Output band reaches only the signature.** Case: an "above 100" or "near 10" output on an ordinary act. Rule: derived bands are an attribute times a factor, so a `minimal` body (ratings near 10) derives ordinary acts near 8 beside a 130 signature, and an ordinary band above 100 needs an attribute above 125. Both are legal. Effect: the band axis is a signature axis; ordinary-act extremes come from the attribute profile axis. No change proposed.
9. **Status roles use explicit intensity overrides.** Case: the band axis needs an output on hinderer, applier, guard, booster and binder, all status effects. Rule: the contract says a status override needs a source reason and should normally be a range. The samples use ranges and the `nameOrigin` note as the reason; a canon species would need real evidence. No change proposed.
10. **Passive shapes are outside the grid.** Case: contact, harmed and ally-harmed triggers and ongoing passives. The grid validates against `ActionSchema`, per the spec, so passive shapes are not exercised, and the sample species carry no passives. Smallest change: a second grid against `PassiveSchema` if a game reads passives.
11. **Some element statuses are off the medium rows.** Case: hinderers and appliers whose status the element's medium row does not carry (each row holds one status and one bind; metal holds neither). Those acts derive only through an authored mechanism, which the templates add when the row lacks the status. Smallest change: none; noted so a game does not read "no derived act" as "no hinderer".
