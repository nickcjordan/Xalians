# The Dormant Powerworks: playable prototype

Route: `/powerworks`. Entry is linked from site navigation. No account is needed.

The four-companion squad crosses four encounters against dedicated, noncollectible facility enemies. Select a creature, choose its move, assign a target, and commit the whole squad. Enemy orders are committed before player choices and remain hidden; visible charge/recovery/status information is public. Speed interleaves both sides. Playback can be skipped, and the combat record explains damage, interruption and retargeting.

## Implementation boundaries

- Rules: `packages/rules/src/dungeon/index.ts`; tunable cards and encounter rosters: `cards.json` beside it. These are deliberately frozen paper-prototype cards, not canonical creature generation or the newly evolving ability schema. Future integration is tracked separately in #299.
- UI: `apps/web/src/pages/games/powerworksPage.tsx` and its scoped stylesheet. Existing player species silhouettes; native vector placeholders for the five machine roles.
- Persistent health and knockouts, one half-health between-encounter revival, and a pre-boss +10 HP station. Move allowances refresh between encounters. A full wipe ends the run. Extraction is available between encounters.
- Enemy charge cycle: charge, release (or interrupted release), one ordinary-action recovery opportunity, then charge again. Ordinary enemies have unlimited actions; player moves retain finite uses.
- Temporary exhaustion resolution: after all damaging moves are exhausted, the player may explicitly select **Desperate strike**, 3 neutral melee damage with 2 self-recoil. It is never substituted automatically for a failed signature. Restraint can block it. This prototype choice prevents permanent exhausted-move stalls and remains a tuning/design question in #300.
- Local practice XP is only a run score (10/10/10/30), with no credits, tokens, account writes, or collection effects. Trading, progression/perks, team selection, generated content and multiplayer are outside this first slice.
- Browser-local saves store a versioned seed and command history. Replaying validates commands instead of trusting serialized health or XP. Reload restores the last resolved round; unfinished selections are not saved. Restart requires an in-game confirmation. Saves are device/browser-specific.

## Playtest and iteration record, 2026-09-16

Completed a full live browser run (seed 1) through all four encounters using actual move/target controls. Verified health carryover, refreshed allowances, redirected signatures, ordinary enemy mix, charging, interruption, recurring boss release and victory at 60 practice XP. The power chamber demonstrated Graviclaw applying slow restraint after charge begins, blocking the following opportunity. At the boss, Avilily interrupted the first release; the second hit Graviclaw for 27 before the squad won. Finished the boss on a 390×844 viewport.

Changes made from live testing:

1. Increased silhouette contrast against the dark battlefield.
2. Added target shortcuts beside move controls to avoid repeated battlefield scrolling, especially on phones.
3. Display simultaneous statuses (charged AND restrained) rather than hiding one behind the other.
4. Added inspectable enemy ability notes without exposing chosen enemy orders.
5. Slowed event playback for reading, retaining an immediate-result button and reduced-motion behavior.
6. Used a native modal for keyboard focus containment and Escape dismissal when restarting.

Validation: rules tests cover invalid orders, restraint, signature fallback targeting, immediate battle termination, recurring boss recovery, revival/persistence, exhaustion recoil, full wipe, deterministic saves and terminating seeded runs. UI tests cover full-squad gating, round resolution, save restoration and corrupt-save recovery. Full existing suites passed during integration (356 rules tests and 1,226 existing web tests); two new UI tests also pass. Production build and route budgets pass. Integration included current main rather than publishing the old checkout over newer work.

This establishes a usable first slice, not final difficulty or broad roster balance. Remaining priorities: real moveset integration, alternate squads, richer secondary decisions, status-chain limits, and playtesting with the user. The introductory dungeon is intentionally forgiving. Do not mark the broader design backlog complete.
