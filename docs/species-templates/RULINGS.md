# Species rulings (ratified by Nick)

Per-species decisions that a migration agent cannot derive from the sources alone. The agent stays pilot-blind and does not read this file; the orchestrator applies these when reviewing a run and the validator script enforces the ones it can (signature reservations live in the catalog ledgers).

## General

- 2026-09-02: levers, not stone. Every ruling here is a tuned setting, reopened by a concrete case met while building, never by taste; agents report the case and the smallest fix in the moment, Nick decides. Full statement in the repo `CLAUDE.md`.
- 2026-09-02: one surface key. `shell` is the armored aspect; `hide` means the body has no armored aspect; a species never declares both. Enforced by the script (`anatomy.surface`).

- 2026-09-02: the species artwork (`art/<key>.png`, rendered from `my-app/src/svg/species/`) is source material equal to the description; parts visible in the art are sourced, not authored.
- 2026-09-02: conjured familiars are projections, not life. A central mind may conjure a swarm of hologram-like or ghost-like familiars that phase away when destroyed; this is not summoning or creating life. The `swarm` channel covers such a familiar swarm regardless of the creature's own body plan.

- 2026-09-02: trait model. Every pool trait is rolled independently at its own percent (1 to 100); 100 means every individual; no count, minimum, or cap; `guaranteed` and `rolledCount` retired. Exclusion partners: the generator rolls the higher percent first and skips the partner if it lands; never both at 100. A planet-wide sentence may justify an environmental adaptation trait (nocturnal, resistant) at or near 100, never a behavioral one.
- 2026-09-02: catalog tags. A name carries instrument tags only when the name itself names or implies a part (Wraith Claws stays gated to claws); a name that names no part carries no tag and is drawable by any instrument that can perform the action. The 63 ghost rake names tagged claws without naming a part were untagged.

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
