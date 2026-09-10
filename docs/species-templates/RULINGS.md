# Species rulings (ratified by Nick)

Per-species decisions that a migration agent cannot derive from the sources alone. The agent stays pilot-blind and does not read this file; the orchestrator applies these when reviewing a run and the validator script enforces the ones it can (signature reservations live in the catalog ledgers).

## General

- 2026-09-02: levers, not stone. Every ruling here is a tuned setting, reopened by a concrete case met while building, never by taste; agents report the case and the smallest fix in the moment, Nick decides. Full statement in the repo `CLAUDE.md`.
- 2026-09-02: one surface key. `shell` is the armored aspect; `hide` means the body has no armored aspect; a species never declares both. Enforced by the script (`anatomy.surface`).

- 2026-09-02: the species artwork (`art/<key>.png`, rendered from `my-app/src/svg/species/`) is source material equal to the description; parts visible in the art are sourced, not authored.
- 2026-09-02: conjured familiars are projections, not life. A central mind may conjure a swarm of hologram-like or ghost-like familiars that phase away when destroyed; this is not summoning or creating life. The `swarm` channel covers such a familiar swarm regardless of the creature's own body plan.

- 2026-09-02: trait model. Every pool trait is rolled independently at its own percent (1 to 100); 100 means every individual; no count, minimum, or cap; `guaranteed` and `rolledCount` retired. Exclusion partners: the generator rolls the higher percent first and skips the partner if it lands; never both at 100. A planet-wide sentence may justify an environmental adaptation trait (nocturnal, resistant) at or near 100, never a behavioral one.
- 2026-09-02: catalog tags. A name carries instrument tags only when the name itself names or implies a part (Wraith Claws stays gated to claws); a name that names no part carries no tag and is drawable by any instrument that can perform the action. The 63 ghost rake names tagged claws without naming a part were untagged.

- 2026-09-09 (Nick): prose `body` struck, `lore.appearance` list adopted. After three body passes (art inventory, defining features, record-only) Nick ruled that a paragraph built from record facts reads as bullet points forced into sentences, that exact measurements do not belong in it (they live in `physiology.size`; use relative words), and that the art is a fair source for major visible features (Akinza's large rabbit-like ears and large eyes) but not for their shape, angle or count. `lore.appearance` is 3 to 8 short entries, one quality each. All 30 records converted; entries are draft until Nick signs off.
- 2026-09-10 (Nick): the religious register (Blessing, Benediction, Grace, Providence, Sanctify, Consecration) belongs to both ward and mend; the three held light/mend placements stay and the neutral mend pool gains the six words.
- 2026-09-10 (Nick, via the placement audit): catalog placement soundness. Four Sonnet agents re-judged every placement of the 470 names the struck 2026-09-07 ledger had listed (970 placements); the orchestrator reviewed all 346 UNSOUND verdicts and applied 189 removals and 34 moves. Policy: duplication is never a reason; a placement goes only when it fails its action definition (a liquid deluge is not a hurled solid; a clutch is not a drain) or when an elemental word sits in the neutral pool (Fog, Flare, Ray, Bloom would otherwise be drawn by every element); a bare neutral word in an element cell is tolerated overlap and stays. 154 agent verdicts overturned as pattern arguments or judgment calls; 3 held for Nick (Benediction, Blessing, Grace in light/mend, the religious ward/mend split). Ledger: docs/ability-catalog/placement-audit-2026-09-10/FABLE-AUDIT.md. Catalog now 20,776 element names and 1,060 neutral names; 0 thin cells.
- 2026-09-09 (Nick): Frackworm ratified as canon species 00030 (Endessa, sand) after a clean-up pass: teaser into species.json, habits rewritten, pool reshaped (armored 100; anchored 40, ramming 30, hardened 30), encyclopedia entry, RATIFIED.json 1.1.0. Thirty species.
- 2026-09-09 (Nick): Phantiri Xalians are non-corporeal across the board; the Leviticus Overdrive rewrite is the point of that world, so no organic species is generated there. Smokat moved from a flesh biped to a body of smoke that holds a feline shape (composition gas, covering mist, phasing 100, diet none, ageless); its habits rewritten to the Overdrive origin. Lever set the same day: lifespan cut 1 widened from spectral and energy to every non-corporeal body (a smoke body is not short-lived by mass).
- 2026-09-09 (Nick): all 30 appearance lists ratified after the second pass. Voltish ruled a biped (crouching, clawed hands): bodyPlan biped, manipulation 55 to 75.
- 2026-09-09 (Nick): appearance entry rules from his corrections on the first list pass: one concept per entry; physical presentation only (an eye is a feature, "nearly blind" is not); no absent-anatomy inventories (only "without limbs" when that is the form); no stated defaults ("unarmored"); no definitive claims that fence future lore ("the largest thing on Endessa"); readable phrases, not torn clauses. Art corrections landed the same day: Luceras has a pair of curved ram-like horns, not one; Thirstaserp's tail is a rattle shaped like a lotus flower, not blades; Voltish has no crest (the reading mistook a raised forelimb gathering lightning); Xylum is an inverted squid-like organism with its mantle underground, six serrated tentacles, eyes at the soil line on either side and a mouth where the tentacles meet. Frackworm art now exists.
- 2026-09-09 (Nick): body is defining features only. The first body pass inventoried the artwork (Dromeus "two rows of triangular pointed teeth"); Nick ruled those are how the one image was rendered, not defining qualities of the creature. A body detail belongs only if the next artist would have to keep it: body plan, listed anatomy, covering, composition, size feel, locomotion, leading sense. Tooth and pupil shape, drawn counts of eyes, nostrils, digits and tufts, banding counts and pose stay in the walkthrough art reading. All 30 bodies re-cut. Tightened the same day after Chromocat ("long tufted points" were its ears): the art is not a source for the body at all; body clauses come from the teaser and the record fields only, and the floor drops to 25 words. Pattern approved on Chromocat, Dromeus and Imprit; the full pass applied to the rest.
- 2026-09-09 (Nick): lore split. `lore.description` is Nick's teaser, species.json verbatim, never rewritten; `lore.body` (physical) and `lore.habits` (how it lives now) are new authored prose fields, 40 to 120 words each, reviewed by Nick per planet batch; the evidence bar reads body and habits as source after sign-off. `descriptionStatus` and `amendments` struck from records: no metadata in the creature JSON; review status lives in `docs/species-templates/lore-status.json`.
- 2026-09-08 (Nick): `grappling` and `commanding` added; `armored` widened to a covering the body reliably forms on itself. No abrasion clause on `hardened`: every planet has abrasive particulate, so it distinguishes nothing. Zolton's Generator report line softened to allow storage in some lineages (it denied its own flagship native, Voltish).
- 2026-09-08 (Nick): trait pool shape. Required traits at 100: one minimum, two normally, three only as a special case; the traits that define the species in its own lore. Rolled traits: everything else evidenced, 5 to 60 each, percents summing to 100 across the rolled set. At most six entries per pool. A trait never restates a record field (senses never make perceptive required). Legacy statRatings of high rank a rolled trait first, they do not set a percent. The 2026-09-07 evidence bar still decides what is admissible; the shape decides where it sits.
- 2026-09-07 (Nick): the catalog's one-cell-per-name rule is struck. A name may sit in more than one action cell, in more than one element file, and in the neutral pool as well as an element cell, wherever each placement is logically sound on its own. The 2026-09-07 dedupe ledger was not applied.

## Frackworm

- 2026-09-04: covering `chitin`, anatomy `jaws, vents, shell, body, eyes`, `armored` 100. A worm that bores through rock and glass sand wears grown overlapping armor plates, not hide. Eyes are tiny pinpoint dots on the collar behind the drill, no stalks (2026-09-04 later ruling: stalk eyes read goofy); sight stays 0 to 15. Art brief: the signature is the sand slurry blasting from the vent ring behind the head; the drill head is a blunt ringed cone with a small maw, never a mouth full of teeth. Applies the relatable-first principle in docs/design/xalian-creature-system-redesign.md section 1.

## Graviclaw

- 2026-09-01: signature is Point of No Return, pincers / snare / dark (the pull past the horizon into the claws, not the crushing close). Recorded in `consolidated-dark.md` line 52.
- 2026-09-02: amphibious. Breathes and operates in both liquid and gas; it hunts submerged in the wetlands and roots itself to the ground against larger foes.
- 2026-09-02: `hide` removed; anatomy pincers, shell, body; instruments pincers, shell.

## Tetrahive

- 2026-09-02: a central bat-like creature with a mind that conjures a swarm of ghost-like familiars (the art shows one large winged body with clawed hands, a long curled tail, pointed ears, and eyes, surrounded by many small bat familiars). The familiars are projections that phase away. It has wings. Body plan: Nick, later the same day: a creature whose whole way of fighting is a cloud of units reads as swarm rather than avian, so bodyPlan is swarm and the central body's wings, claws and tail stay in anatomy (applied when the registry definitions are ratified).

## Registry definitions

- 2026-09-02: `docs/species-templates/REGISTRY-DEFINITIONS.md` ratified after five blind passes; `sessile` declined; Xylum is `multiped` with burrow movement; Tetrahive `bodyPlan` is `swarm`.
- 2026-09-02 (trait model, second ruling): the template pool lists only traits above 0 and absence means 0 (amended the same day: the registry is additive, so exhaustive lists would go stale); the generated individual stores only the keys that landed; percents are read back from the template pinned by generatorVersion.
- 2026-09-02: no dramatic sign-off in species prose; the last sentence states a plain present-tense fact (skill v2.10, lore-voice skill).

## Conduits

- 2026-09-02: mechanism ratified (two gates: medium matches and the part is a declared, sourced conduit); the 14-row medium action table is a draft pending sign-off. Applied: Graviclaw pincers/dark; Hypnopet crest/psychic; Figzy mind and fists/psychic; Tizzie gaze/psychic; Tetrahive, Smokat, Ectoghoul none.
- 2026-09-02: the 14-row medium action table ratified as drafted (skill section 5.7a).
- 2026-09-02: archetype weights are integer percents summing to exactly 100 (one roll per creature); the 1 to 5 relative scale is retired. Nine records converted: graviclaw: juggernaut 33, bulwark 27, predator 20, vanguard 13, stalwart 7; tetrahive: skirmisher 33, sage 27, prowler 20, seeker 13, sovereign 7; smokat: prowler 33, predator 27, skirmisher 20, seeker 13, rogue 7; ectoghoul: prowler 33, skirmisher 27, rogue 20, predator 13, seeker 7; tizzie: virtuoso 36, prowler 22, skirmisher 21, sage 14, rogue 7; figzy: sage 36, seeker 22, skirmisher 21, virtuoso 14, prowler 7; hypnopet: sage 33, sovereign 27, seeker 20, virtuoso 13, runner 7; akinza: prowler 38, skirmisher 31, predator 23, runner 8; yetimoth: juggernaut 33, bulwark 27, vanguard 20, stalwart 13, survivor 7.
- 2026-09-02: Akinza and Yetimoth ratified as presented (Krystos complete).
- 2026-09-02: archetype rows re-authored per species to break the shared 5-4-3-2-1 ladder (Nick): graviclaw: juggernaut 45, bulwark 25, predator 20, stalwart 10; tetrahive: sage 42, skirmisher 24, sovereign 18, seeker 16; smokat: prowler 40, skirmisher 30, predator 22, rogue 8; ectoghoul: prowler 35, rogue 30, skirmisher 20, predator 15; tizzie: virtuoso 40, sovereign 25, prowler 15, skirmisher 12, sage 8; figzy: sage 50, seeker 20, virtuoso 15, skirmisher 15; hypnopet: sovereign 38, sage 30, virtuoso 22, seeker 10; akinza: prowler 45, skirmisher 30, predator 25; yetimoth: juggernaut 36, bulwark 34, stalwart 18, vanguard 12.

## Magmuth and Floria batch (pending Nick)

- 2026-09-02: Dromeus, Imprit, Xylum, Kosanos, Avilily migrated, validated, amended; presented with three lever questions (partial-surface covering, small-flier lifespan clause, forelimb-work body plan clause) and rulings on composition-from-element (never), Kosanos trunk plus blades, Xylum height as visible crown.
- 2026-09-02: Dromeus, Imprit, Xylum, Kosanos, Avilily ratified as presented, with the orchestrator rulings (Kosanos flesh and omnivore; Imprit no tail conduit, fists, fangs, luminous 100; Avilily no conduit; Xylum height as visible crown; Kosanos trunk plus blades). Covering rule amended: a named partial surface is the covering when nothing else is named or shown; Dromeus is `feathers`.
- 2026-09-02: lifespan rubric cut 3 narrowed: `fleeting` under 20 kg only for swarm and conjured-unit bodies; a small flier that gathers in numbers is `short`. Avilily is `short`.
- 2026-09-02: body plan selection amended: a description naming forelimb work overrides the art only when no forelimb bears weight in the art; a hand-user drawn on all fours is `quadruped`. Imprit is `quadruped`.
- 2026-09-02: `vents` covers an oral discharge organ (Venemist); a flesh animal body with the `hide` anatomy key and no surface named takes the `hide` covering (Kosanos, Hippochamp). Drainov, Poseidas, Zolton batch: Bioflim, Venemist, Newtapede, Hippochamp, Voltish migrated, validated, amended; presented to Nick.
- 2026-09-02: Luminax, Saiphus, Veridium batch: Crystorn, Chromocat, Luceras, Neph, Foromeer migrated, validated, amended. Rulings: Crystorn crown is `core`; Chromocat teleport is apparent speed and its signature is rake; Luceras head growth is an ear; Foromeer has no metal composition secondary and takes the armored lifespan adjustment; Neph weight band stays low (rubric note: a floating body under-masses its size; no change made).

## Planet rebuild (2026-09-02)

- Planet source is now `planetRecords.json` (history unchanged; `physical.derived.gravityEarth`; `environment.habitableBandC` / `meanC` / `extremeC`; `report.terrain.features`) with `planetStatus.json` as political context. Species temperature bands validate against the habitable band, never the extremes. The 24 records migrated before the rebuild were re-banded by intersection (or to the full habitable band where the old sub-band barely overlapped); size bands were authored around legacy figures as relative gauges and were not re-derived, though several planets changed gravity materially (Saiphus 0.36 to 1.79 g, Poseidas 1.7 to 0.73 g, Krystos 1.2 to 0.54 g, Stonera 0.74 to 0.53 g, Magmuth 1.25 to 1.53 g).
  - graviclaw: [-6, 34] -> [-60, 5] (full habitable band (the old sub-band barely overlapped it))
  - tetrahive: [-6, 34] -> [-60, 5] (full habitable band (the old sub-band barely overlapped it))
  - smokat: [-30, 45] -> [-30, 20] (intersection)
  - ectoghoul: [-58, 53] -> [-50, 20] (intersection)
  - tizzie: unchanged [12, 42] inside [5, 50]
  - figzy: unchanged [12, 44] inside [5, 50]
  - hypnopet: unchanged [12, 40] inside [5, 50]
  - akinza: [-95, -10] -> [-60, -10] (intersection)
  - yetimoth: [-122, -10] -> [-60, -10] (intersection)
  - dromeus: [65, 240] -> [65, 105] (intersection)
  - imprit: [65, 300] -> [65, 105] (intersection)
  - xylum: unchanged [-4, 34] inside [-5, 45]
  - kosanos: unchanged [2, 36] inside [-5, 45]
  - avilily: unchanged [4, 38] inside [-5, 45]
  - bioflim: [-10, 43] -> [0, 43] (intersection)
  - venemist: [-10, 43] -> [0, 43] (intersection)
  - newtapede: unchanged [5, 40] inside [-2, 40]
  - hippochamp: [5, 52] -> [5, 40] (intersection)
  - voltish: [-60, 45] -> [-55, 35] (intersection)
  - crystorn: [30, 95] -> [30, 70] (intersection)
  - chromocat: [25, 95] -> [25, 70] (intersection)
  - luceras: [-34, 42] -> [-30, 42] (intersection)
  - neph: [-60, 45] -> [-30, 45] (intersection)
  - foromeer: [-12, 36] -> [-10, 36] (intersection)
- 2026-09-02: Stonera and Endessa batch: Codazzo, Terragoyle, Scalatto, Thirstaserp, Drilltail migrated, validated, amended; roster complete (29 of 29). Rulings: Terragoyle stone is a held object, not composition; carried source descriptions may have unambiguous misspellings corrected with a note (species.json to be fixed upstream); the armored-covering lifespan adjustment is applied as written (Foromeer, Scalatto, Drilltail are `long`); Drilltail signature is pincers / crush. Notes carried, no change made: a resting perch read as a gait (Terragoyle), the armored clause on small disposable chitin bodies (Drilltail), the rock `burst` cell being unreachable for spined species, and `communication` having no unknown value.
- 2026-09-02: art corrections from Nick: Crystorn has two crystal horns (`horns`, light conduit); Luceras has two curved ram horns (`horns`, signature horns / shove); Foromeer has antennae on its head and its drills are its hands (`spurs`, signature spurs / strike).
- 2026-09-02 (Nick): misspellings are never carried into a record; species.json corrected upstream (Crystorn temperament, Avilily petals and Avililies, Terragoyle levitating and Terragoyles). Drilltail signature is the drill tail (tail / strike), not the pincers.
- 2026-09-02: Frackworm authored (species 00030, Endessa, sand) and migrated; covering hide under the flesh-animal ruling pending art; no artwork exists yet.
