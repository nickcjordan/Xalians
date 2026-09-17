# Powerworks composition, art, and action pass

September 17, 2026. Follow-up to [the shared-scene iteration](powerworks-scene-iteration.md), tracked by [issue 331](https://github.com/nickcjordan/Xalians/issues/331).

## Scope and criteria

Nick requested four improvements: scene composition across screen shapes, clearer queued targets and exceptional actions, consistent character presentation with better poses, and pacing that distinguishes routine actions from major moments. This pass preserves the existing local game, combat rules, moves, hidden enemy orders, save format, and practice rewards. The art is an illustrative treatment for this prototype, not a change to canonical creature records or anatomy.

Implemented:

- A width-bounded battle composition, centered as a complete encounter on tall screens. Character slots grow with the battlefield; two defenders occupy the central lanes instead of opposite edges. Boss scale remains distinct. Compact desktop layouts retain the commit control.
- Matching companion numbers, visible destination labels, and individual order markers beneath each target. Selecting a marker returns to that companion's order. The active queued order has a visible path; this does not expose any enemy order or add formation mechanics.
- Signatures receive a named event ribbon and actor emphasis. Redirects identify the new target, highlight it, and show the connection even while paused. Restraint blocks show a stop symbol, reaction, and cause. Event ribbons occupy the lower scene strip rather than covering enemies.
- Nine painted transparent sprites replace the previous silhouettes and geometric machines throughout this game's shared portraits, including inspection and results. Ready poses, casting/lunging, restraint reactions, and knockout collapse share the same sprites and lighting. These are 2D sprite transforms, not skeletal animation.
- Routine actions resolve in 1.15 seconds, signatures in 1.8 seconds, knockouts in 2 seconds, and guardian defeat in 2.8 seconds at normal speed. Signature anticipation is longer than a routine hit. Impact timing and effects share one presentation descriptor. Pause, step, speed, skip, and reduced motion remain available. Reduced motion preserves event information without travel or collapse animations.
- Committing, replaying, and entering a sector bring the battlefield into view on phones. Existing move-to-target and target-to-next-companion navigation remains.

## Problems found and revised during play

| Evidence | Revision |
| --- | --- |
| Tall windows separated small figures across a large stage. | Bound the stage by width, increase character space, and center the title, scene, and controls together. |
| A queued count did not identify which companions would attack. | Individual numbered companion markers and visible destinations, with direct order editing. |
| Status text and four queued markers wrapped into each other on phones. | Separate status and queued-order rows. |
| An overlay ribbon covered the central enemy during redirection. | Reserve the lower scene strip for event ribbons and remove duplicate redirect floating text. |
| Pausing hid the redirect line along with moving projectiles. | Keep the static redirect link visible while paused. |
| The first Avilily illustration replaced its gripping feet with feather fans. | Reject that draft and regenerate the feet as distinct legs and talons using the image as a reference. |
| Committing near the bottom of a short phone left the fight partly offscreen. | Reveal the battlefield after commit, replay, and sector entry. |

## Artwork provenance and constraints

Assets are under `apps/web/public/assets/powerworks/`. All nine sprites were generated with the built-in ImageGen tool and encoded as 512 by 512 WebP, quality 85, preserving alpha. The nine files total 613,834 bytes. The existing 257,298-byte environment is unchanged. They load as separate cached images, not embedded JavaScript.

Companion inputs were the existing `docs/species-templates/art/{species}.png` silhouettes, checked alongside the species appearance notes. Canonical files were not modified. The common prompt requested a full-body, centered, transparent sprite with sculpted volumes, restrained painted texture, readable shapes, warm upper-left light, cool teal rim light, and a slight three-quarter perspective. No floor, shadow, UI, text, or border. Keep recognizable anatomy and identity; do not add armor or generic monster-game features.

| Sprite | Identity constraints / generation direction |
| --- | --- |
| Graviclaw | Black chitin, crab lower body and many jointed legs, upright heavy torso, small head, one massive pincer. No floating gravity effect in the ready sprite. |
| Avilily | Bright green floral bird, petal-shaped flower beak, feather crest, broad wings, streamer feathers, gripping feet. Hovering pose. A corrective edit preserved the rest of the image while replacing the erroneous feather fans below its body with slender legs and splayed talons. |
| Crystorn | Heavy shaggy cream-colored browser, bovine muzzle, side ears, two faceted crown crystals, seated upright with folded legs and relaxed arms. |
| Hippochamp | Four-legged horse body and seahorse head, smooth blue hide, long cannon snout, sail-like crest, back fins, blunt hooves, coiled tail. Rearing ready pose without a permanent water jet. |
| Crawler | Low maintenance crab machine, four splayed metal legs, two small tool claws, broad angular shell, amber lens. |
| Drone | Hovering hexagonal security machine, circular cyan lens, two horizontal fan housings, no legs. |
| Bulwark (`shield`) | Squat defense machine with broad feet, layered octagonal shield body and pale-gold central shield emblem. |
| Capacitor (`discharge`) | Upright machine on splayed supports, stacked side coils, glass amber charge tube, terminal above. |
| Guardian | Broad armored arms and shoulders, short braced legs, octagonal torso, large amber turbine chest core, crown-like metal fins. No humanoid face. |

Enemy prompts use one material vocabulary: weathered dark teal iron, aged bronze edge plates, bolts, restrained wear, warm key light and cool rim light. These remain noncollectible, game-specific facility defenses.

## Verification

Local browser play completed all four sectors through victory, including normal and faster playback, paused stepping, melee and ranged hits, signatures, redirection, restraint blocks, charge/recovery, an allied knockout, move depletion, and the final remaining defense after the guardian fell. The surviving squad finished with Crystorn 56, Hippochamp 39, Graviclaw 23, and Avilily knocked out; 60 practice XP and one unused revival. Saved-result reload is checked separately from transient animation state.

Visual review covers 1280x720, 1440x1000, 892x1190, 390x844, and 375x667. Inspected actual scenes and loaded sprites, not just the DOM. Automated coverage checks queued-order editing, hidden charge targets, melee redirection, impact timing, pause/resume, reduced motion, and the relative emphasis of signatures, knockouts, and guardian defeat. The complete web suite passed 1,253 tests across 83 files; TypeScript and production build/bundle checks passed.

Deployment and live verification are recorded on issue 331. Agent visual evaluation and automated checks do not establish first-time human comprehension or enjoyment. Bespoke articulated animation and authored sound remain opportunities; they are not claimed by this sprite presentation pass.

PR 347 passed all three required checks and deployed as `65593bf`. A fresh live CDN-origin run completed all four sectors to victory, including guardian defeat while another defender remained, an allied knockout, exhausted moves, and 60 practice XP. Reload restored victory and the browser reported no errors. A production check at 375px caught awkward wrapping in the guardian-defeat title; the follow-up stacks its label above the title and reduces only that phone title's size. The xalians.com tab had an uncommitted order, so it was deliberately left on its current page without reloading or advancing it.
