# Species rulings (ratified by Nick)

Per-species decisions that a migration agent cannot derive from the sources alone. The agent stays pilot-blind and does not read this file; the orchestrator applies these when reviewing a run and the validator script enforces the ones it can (signature reservations live in the catalog ledgers).

## General

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
- 2026-09-02 (trait model, second ruling): the template pool is exhaustive, all 24 traits at 0 to 100; the generated individual stores only the keys that landed; percents are read back from the template pinned by generatorVersion.
