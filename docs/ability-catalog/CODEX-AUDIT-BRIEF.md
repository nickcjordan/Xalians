# Audit Brief: Xalians Creature System + Ability Name Catalog

You are auditing a game-data design produced over several working sessions by one designer (Nick) and one AI assistant. Your job: find holes. Logical gaps, contract ambiguities, scaling risks, failure modes, internally inconsistent rules, and anything that will hurt when this ships. Do not restate the design back; deliver findings.

## The system in brief

Xalians is a creature-generation/collection game (lore: creatures are printed by machines called Generators from seeded "Scrambler Token" genomes). Core principle: **creatures describe nature; games derive rules.** A creature's record is immutable after generation; every game ships its own derivation layer mapping record facts to mechanics; nothing game-specific is stored in the record.

**Record structure** (root = id, species, provenance block, then layers in generation order):
- provenance: seed (128-bit), generatorVersion (pins the ENTIRE content-table snapshot: species templates, all vocabularies, odds; no field ever resolves against "current" data), schemaVersion, generatedAt, origin (planet), serial.
- physiology: corporeality, composition {primary, optional secondary}, bodyPlan, covering, heightCm/weightKg (rolled in species bands), respiration, diet, communication, climateTolerance {lowC, highC}, capabilities (7 graded 0-100: flight/swim/burrow/climb/sprint/leap/manipulation), senses (sight/hearing/smell 0-100 + special list e.g. tremorsense).
- archetype: {key, favors:[two attributes]} — rolled per individual from species weights; tilts its two favored attributes toward band tops (favored-only, nothing suppressed). 16-entry global roster (vanguard, juggernaut, berserker, bulwark, survivor, stalwart, skirmisher, runner, prowler, predator, seeker, sage, virtuoso, sovereign, rogue, balanced); every one of the 10 attributes is favored by exactly 3 archetypes.
- attributes: 10 axes 0-100 (strength, vitality, endurance, agility, reflex, intelligence, willpower, instinct, charisma, resilience), rolled within species bands + archetype tilt.
- element: {primary (fixed by species, affinity 100), affinities map (graded 1-99 secondaries from a per-planet adjacency graph; primary duplicated at 100 deliberately), anomalous flag (off-graph roll)}. Odds 75% none / 24% one on-graph / 1% anomalous; templates omit odds to inherit baseline.
- traits: {guaranteed:[...], rolled:[...]} — guaranteed granted by the body (chitin -> armored), rolled are weighted draws; rolled pool is strictly additive (rare rolls always have MORE than baseline, never a baseline missing identity). 24-key global vocabulary, each passive|reactive, no negative traits, exclusion list for true contradictions only.
- temperament: 5 stored 0-100 axes (boldness, curiosity, energy, aggression, sociability), rolled LAST, weighted by the already-rolled body (aggression tilted by strength etc.), never zeroed (gentle-giant mismatches stay possible, rare). Games derive behavior from temperament, never power. Display adjectives are derived at render time, not stored.
- appearance: {finish} from global odds (standard / gleam ~1/40 / prismatic ~1/400 / eclipse ~1/4000), applied as styling overlays on silhouette-style art; variant/pattern/palette reserved fields, omitted until real.
- abilities: composed acts {name, signature, instrument, action, medium, intensity 1-10, description(signature only)}. Grammar: 25 instruments (jaws, pincers, mind, ...) each with allowed actions; 16 actions (strike, lash, crush, rake, shove, drain, ambush, beam, hurl, spray, burst, cloud, snare, ward, mend, terrorize); medium = primary element or rolled affinity. Species declare 1-3 instruments + ONE hand-authored signature ability (grander-register name, exempt from 2-word limit, collision-checked against catalog; carries baseline grammar fields so games that don't know the species can run it generically; bespoke behavior is per-game interpretation keyed to the signature).

**Principles ratified:** store what the Generator did, never what words mean (roll facts inline, definitions in registry); optional fields omitted when N/A (never null); every controlled vocabulary ships as machine-readable registry data (key + display + one-line nature); balance NEVER touches records (fixes = per-game derivation patches or next generatorVersion affecting only future generations); uniform 0-100 for all graded values; no reality-breaking powers (no teleport/time-reversal/mind-puppeting/creating-life/permanent transformation — bounded look-alikes only); Xalians are sexless and speak no language (canon).

## The ability-name catalog (current work)

Old approach (template-fill: "{MediumAdj} {Instrument} {ArchetypeNoun}" -> "Graving Will Snare") was struck for producing taxonomy-recital clunkers. Replacement: a **curated name catalog**: entries {name, action, medium(s), instruments?, minIntensity?}. At generation: roll instrument/action/medium/intensity as before, then DRAW a name from the (action x medium) cell, filtered to entries that are instrument-neutral or tagged with the rolled instrument, weighted so heavier names go to heavier intensity rolls. Names are shared across creatures deliberately (comparison culture). A name lives in exactly one action cell; it may carry multiple medium tags when the definition audit passes for each (e.g. "Tidal Lash" water+dark via tidal forces; "Stasis" dark+ice).

Rules: definition-audited medium tags (a water-defined word like Undertow can never be tagged dark, however good the metaphor); mandatory instrument tags for anatomy-evoking names (Wraith Vise -> pincers/jaws/tendrils); instrument is a subtractive filter, never a third catalog key; no Earth-fauna references; no borrowed names from existing creature games; no combining forms as standalone words (no bare "chrono"); 1-2 word names; American English; no modern idiom; religious register permitted abstractly; canon-compliance audit (e.g. a heal named "Rewind" was cut because canon forbids time reversal).

Coverage floors (safety net, NOT authoring targets): >=6 valid names per reachable (instrument x action x medium) combination, >=30 total per species, enforced by an automated checker whenever catalog or species templates change.

**Production pipeline (4 stages):** Stage 1: ~30 cheap-model agents each exhaustively harvest ONE semantic field (14 element mediums + 16 actions) from external sources (designer's legacy word lists used only as a secondary cross-check afterward, never the starting source). All 30 complete; each wrote a log file. Stage 2 (in progress): the orchestrating AI consolidates per element: dedupe, cross-tag discovery, compose cells, cut with per-name justifications in a kept/cut ledger; first element (dark) done: 97 names across 16 cells, honest thin cells (dark spray=2, dark mend=2) surviving via neutral action pools (25-85 neutral names per action usable by any element). Stage 3: fan-out again keyed by planet: agents draft species templates AND evaluate the consolidated catalog through their species' lens. Stage 4: orchestrator audits everything, runs the coverage checker, designer reviews per-planet batches.

29 existing species will be migrated to templates (pilot done: Graviclaw); species templates declare bands for everything, weighted pools, instruments, signature.

## What to audit

1. Contract soundness: ambiguities or contradictions in the record schema, versioning rules, or the store-facts-not-definitions principle that would bite a third-party game developer.
2. Generation pipeline: statistical or design flaws in the roll order (species -> physiology -> archetype -> attributes -> affinity -> traits -> temperament -> finish -> abilities), the favored-only archetype tilt, the never-zeroed temperament weighting, or the odds structure.
3. The name catalog: flaws in the cell model, the one-cell-per-name rule, dual medium tags, instrument filtering, floors, or the draw mechanics (e.g. determinism/seed concerns, name collisions with future signatures, growth over time under the pinned-version rule).
4. Scaling: what breaks at 100+ species, 14 elements fully consolidated, or years of additive vocabulary growth?
5. Process: holes in the 4-stage pipeline itself (consolidation bottlenecks, quality drift across agents, anything unverifiable).
6. Anything else that looks wrong, fragile, or underspecified.

Deliver: a numbered list of findings, each with severity (high/medium/low), the specific hole, and a concrete suggestion. Be adversarial; agreement is not useful.
