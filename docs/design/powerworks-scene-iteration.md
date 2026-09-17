# Powerworks shared-scene iteration

Date: September 17, 2026. Tracks [issue 331](https://github.com/nickcjordan/Xalians/issues/331).

## Intended player experience

The battlefield is the primary representation of combat. Companions and defenses occupy one illustrated facility. The control area supports a consistent bottom-to-top sequence: companion, move, enemy. Planning and committed orders remain distinct. During playback, the actor moves or casts, the effect reaches the recipient, and then health and status change. Inspection and the record explain details without being necessary to identify the event.

The entry, battle, recovery, boss, and final report use the same environment, silhouettes, health display, route, and move vocabulary. Recovery prioritizes companions who need attention. This is a presentation change; positions do not affect combat rules.

## Implemented scope

- Shared illustrated stage, selected-companion ground markers, target reticles, conditional damage previews, and queued target counts.
- Melee travel, ranged projectiles, impact rings, recipient recoil, damage labels, restraint bindings, protective barriers, charge light, and faded knocked-out figures.
- Consequences appear at impact. Pausing or stepping shows the complete action. Resuming after inspection does not rewind health.
- Optional synthesized impact/status tones, off by default. No downloaded sound library or autoplay sound.
- Nonblocking sector arrivals, larger guardian staging, connected entry and outcome illustrations, route progress, and current-sector practice XP reveal.
- Compact planning roster, selected-companion inspection from the move header, and a recovery layout that places knocked-out companions first.
- Keyboard selection and focus return, pause/step/speed/skip, reduced-motion behavior, and readable phone layouts.
- Removed 59 obsolete battle layout rules and the old actor/recipient summary duplicated below the scene.

No combat rules, canonical moves, progression, permanent rewards, platform receipts, or save formats changed. Existing runs remain compatible.

## Reference evidence

Source: [TapGameplay, Dungeon Boss Chapter 1](https://www.youtube.com/watch?v=-JKRADU3FiI), original 2016 footage. These are sampled visual observations, not a complete review of the game or an audio assessment.

| Timestamp | Observed | Applied interpretation |
| --- | --- | --- |
| About 0:40 | Both teams occupy a forest scene; damage appears at a character. | Keep the action and its consequences spatially connected. |
| About 1:02 | Acting-character ground highlight, target reaction, damage/element bonus, compact portrait and abilities. | Use a consistent actor marker and contextual controls, without copying one-character turn selection. |
| About 2:12 and 4:00 | Characters travel between encounters with a small route indicator. | Connect sector arrival, scene, recovery, and progress. |
| 6:47 | Defeated enemies give way to visible coins while the party remains in the environment. | Results should retain expedition context. Our reward remains local practice XP. |
| 7:02 | A ranged effect crosses the scene to the opposing character. | Distinguish a projectile from a melee approach. |
| 7:17 | Damage and an elemental bonus sit beside the affected character. | Put damage and effects on the recipient; retain conditional effectiveness previews during planning. |
| 7:32 | A close combat impact is emphasized by framing, pose, and a damage number. | Give impact its own timing and pose rather than changing HP at the start of the action. |
| 7:37 | A chest and coin/potion reveal appear in the cleared battle environment. | Give completion a visible reward moment, without implying unimplemented loot. |
| 7:47 | The map shows named destinations and completed ratings. | Keep the route and cleared sectors legible. |

Boss-introduction timing and player-knockout treatment in the reference were not fully established by these samples. Our own boss entrance, player knockouts, and defeat were exercised directly. The implementation deliberately retains whole-squad planning, hidden enemy orders, and Powerworks-only enemies.

## Playtest findings and revisions

| Observed friction | Revision and replay |
| --- | --- |
| Phone target previews crossed the central guidance sentence. | Moved target guidance above the enemy line; checked two and three targets at 390px. |
| Playback text crossed enemy status plaques. | Removed the duplicate sentence from the stage; the contextual playback caption remains below. |
| The compact roster removed the only phone inspection control. | Made the active creature identity an inspection button; tested Enter, Escape, and focus return. |
| The resolving label changed the phone header height. | Keep the round label stable; playback status already exists below. |
| A melee path inherited projectile animation. | Suppressed its projectile and extended the actor's travel toward the recipient. |
| Recovery gave decoration and XP priority over injured companions. | Compact recovery header, squad before rewards, knocked-out companions first, shorter banner on short phones. |
| Secondary result actions stacked into an oversized phone footer. | Two-column secondary actions with one full-width primary action. |
| Result artwork overflowed horizontally at intermediate desktop widths. | Match the artwork expansion to actual content padding. |
| Live verification at 892x1190 showed figures floating above their shadows. | Anchor creature masks and enemy SVGs to the bottom of their stage area; replayed phone combat and checked the tall scene again. |
| Knocked-out characters could retain a charge or protective effect. | Suppress active effects for defeated units; fade them in the result scene too. |
| Exhaustion recoil was absent from the concise event caption. | Show recoil on the attacker and explain it in the caption. |
| Opening inspection before impact could reveal HP, then rewind it on close. | Persist a revealed impact across pause/resume; added a regression test. |

Browser runs through the normal controls:

- Seed 1: all four sectors to victory, 60 practice XP per companion. Examined targeting, auto-advance, normal playback, paused stepping, protection, charge, restraint interruption, depleted attacks, and final results.
- Seed 2: deliberately weak attacks and poor boss targeting. Multiple allied knockouts and defeat; 30 practice XP retained. Reload restored the defeat checkpoint.
- Seed 3: weak attacks produced a Graviclaw knockout before the guardian. Recovery exposed the revival; using it restored 32 HP and consumed the one revival. Reload preserved the result.
- Viewports: 1280x720, 1440x1000, 390x844, and 375x667. Inspected images and layouts, not just accessible text. Short phones retain readable controls and bring the next required surface into view when it is offscreen.
- Keyboard: selected-companion inspection, Enter activation, Escape dismissal, and return to the initiating control. Existing keyboard planning and target focus behavior retained.
- Release checks: 1,249 tests across 83 web test files passed; TypeScript and production build/bundle checks passed before integration.
- Automated coverage: impact delay, playback speed, paused/reduced-motion results, resume without HP rewind, inspection, knockout presentation, hidden charge targets, recoil, and existing whole-squad planning/save behavior.

These are agent playtests and regression checks. Human usability feedback has not been collected for this revision.

## Performance and artwork

Measured route cost before final integration: approximately 59.7 KB raw / 20.9 KB gzip JavaScript and 53.4 KB raw / 11.7 KB gzip CSS. Powerworks-only budgets allow about five percent headroom. Other route budgets are unchanged. The background is a separate 257,298-byte WebP.

Background: `apps/web/public/assets/powerworks/turbine-hall.webp`. Generated with the built-in ImageGen tool, then encoded as WebP with sharp-cli. Existing canonical creature silhouettes and code-native mechanical enemy drawings are retained. One environment is reframed and lit across the four sectors; this does not claim four distinct location illustrations or a finished character-animation pipeline.

Generation prompt:

> Create a production game background asset, no UI, no text, no characters or enemies. Wide 3:2 illustration of an abandoned alien hydroelectric powerworks interior for a polished illustrated 2.5D squad battler. High three-quarter view looking into a large industrial hall, broad empty walkable floor occupying the middle and lower 65 percent of frame, enough clear ground for four allied creatures in foreground and three mechanical enemies in the rear. Turbine housings, substantial conduits and a recessed round reactor door across the far wall, a little hardy vegetation creeping into the disused facility, warm worn stone and bronze against deep blue-green metal, restrained cyan light from water channels and warm amber reactor light. Stylized hand-painted game environment with strong readable shapes, painterly material depth, soft atmospheric lighting, beautiful inhabited-world art rather than a UI grid or holographic dashboard. Symmetric-ish staging but natural irregularity. No floor grid, no glowing hex tiles, no creatures, no people, no logos, no letters, no labels. Foreground and midground deliberately low contrast and uncluttered to support overlaid game characters. Crisp high quality, landscape composition.

## Remaining evaluation

The next visual quality ceiling is the character asset pipeline: canonical silhouettes and geometric machines do not have articulated poses or the material detail of the environment. Separate sector paintings and authored sound would also improve identity. These are explicit follow-up opportunities, not prerequisites silently added to the current UX release. They should be judged alongside actual first-time player feedback before more mechanics are layered on.

Release evidence is recorded on issue 331 after deployment verification.

PR 337 deployed successfully as commit `4f94a05`. A fresh four-sector run on the production CDN origin reached victory with 60 practice XP; normal playback, later fights, phone boss/results, combat record, and reload were verified without browser errors. The user's xalians.com checkpoint remained at sector 2, round 1, with HP 49/31/64/56 for Crystorn/Avilily/Graviclaw/Hippochamp. The final live tall-window check led to the additional grounding correction above.
