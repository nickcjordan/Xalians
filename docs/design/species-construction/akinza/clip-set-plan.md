# Akinza: the rest of the game clips (plan, 2026-11-09)

## Context

The slice is done (idle, Night Stalk, furred sprites, v2 atlas, live 3D model; animation-sprite-plan.md stage log). A game cannot use Akinza until it has the contract's required clip set (docs/design/creature-asset-contract.md on creature-pipeline, section 4): `idle` (done), `move`, `hurt`, `evade`, `guard`, `displaced`, `held`, `faint`, `act.light`, `act.heavy`. Nick, 2026-11-09: "Lets get back to the Akinza animation work", then "proceed" on the recommendation to build the rest of the clips. Side facing, 192 px cells, same rig (anim/rig-p8b), fur, palette, render path and atlas as the slice.

## Assumptions and decisions

| # | Assumption or decision | Confidence | Evidence |
|---|---|---|---|
| 1 | Clip lengths and event times are the contract defaults (levers, kept unless a motion reads wrong) | 85% | contract section 3 example and the "Action lengths" row |
| 2 | Clips are in place; `move` keeps the feet planted against the ground the game scrolls, and declares its travel per loop from the stride, not a fixed 1.1 m | 85% | contract decision 9 |
| 3 | `move` is a two-legged run on the toes, not all fours: the rig is a biped with arms not built to bear weight, and the record says "Upright feline biped" with sprint 65 to 88 | 75%, Nick's call (it is look) | akinza.json `bodyPlan: biped`, `capabilities.sprint` |
| 4 | `act.light` is a one-arm claw swipe and `act.heavy` a two-arm overhead claw strike with a small hop; Akinza's anatomy is claws, jaws, tail, hide | 70% | akinza.json `physiology.anatomy`; contract archetypes strike and slam |
| 5 | Build in batches of three, each through the review gate (research, setup check, clay, blind critic, fur, then Nick in motion) | 90% | REVIEW-GATE.md; LESSONS (clips passes 1 to 4) |

## The clips (one line each; what Nick judges is the motion)

| Clip | Length, events | Motion |
|---|---|---|
| hurt | 500 ms, `impact` 80 | Head and chest snap back from a blow in front, ears pin for a moment, tails flick, back to idle |
| evade | 600 ms, `clear` 200 | A quick crouch and spring backward, landing light and back to the idle spot (in place) |
| guard | 900 ms loop, `set` 250 | Sinks a little, both forearms up in front of the face, ears back, weight on the balls of the feet; breathing in the loop |
| displaced | 700 ms, `impact` 60, `settle` 600 | Knocked off balance backward, one stumbling step, catches itself and settles |
| held | 1500 ms loop | Arms pinned to the sides, twisting and straining against it, tails lashing |
| faint | 1200 ms, `down` 900 | Knees buckle, the body folds and drops to its side, down by 900 ms; ears and tails fall limp |
| move | 800 ms loop, `foot_down` 0 and 400 | Light springy run on the toes, body leaning forward, arms low, ears half back, tails streaming and bobbing out of step |
| act.light | 900 ms, `hit` 380, `recover` 700, reach 0.35 m | Quick one-arm claw swipe forward |
| act.heavy | 1400 ms, `hit` 620, `recover` 1100, reach 0.40 m | Rises onto the toes with both arms up, small hop, both claws strike down |

## Batches

1. hurt, evade, guard (short, standing poses; no new extreme rig poses).
2. displaced, held, faint (faint lies on the ground: a new rig range, setup check first).
3. move, act.light, act.heavy (after Nick confirms the gait).

Each batch: research per motion (real-animal video, mechanism note), setup check on any new pose range (my job), clay clips, blind critic in motion at both framings, fixes, fur sprites, then Nick in motion on the review page. Atlas and live model updated once all nine pass.

## Log
- 2026-11-09: plan written; batch 1 started (brief anim/clipset-b1-brief.md).
