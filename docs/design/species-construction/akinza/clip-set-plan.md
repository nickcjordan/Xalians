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
- 2026-11-09: batch 1 clay. Hurt and evade built (checks pass); guard stopped at the setup check: the upper arms across the chest fold the shoulders, and the elbow crease folds past 35 degrees of bend (no elbow corrective in rig-p8b). Decision (orchestrator, rig and process): upper arms straight forward, plus an elbow corrective that weighs zero at 30 degrees of bend or less, so idle and Night Stalk stay byte-identical (proved by re-bake sha256); the head tucks behind the short arms. Guard gets `guard_in` (first pass replaces loop frames 0 to 6) and `guard_out` (loop seam to idle frame 89). Blind critic on hurt and evade: the ear pin read as a flat cap (93 degrees visible; target now at most the Night Stalk peak and 65 degrees), hurt moved a frame before impact, the tail flick was a sway, the evade jump lacked lift, and the return read as a second jump (now shuffle steps). Fix pass 2 queued.
- 2026-11-09: pass 2 built guard (elbow corrective: elbow folds 685 to 0, idle and Night Stalk byte-identical) and fixed hurt's onset, tail whip and knee give, and evade's jump and return (two shuffle steps). Critic pass 2: the ear (under my 65 degree cap) turned its cup to the camera and read as a bonnet in all three clips; hurt's head is carried, not struck; guard reads as begging (arms in unison, pads forward), its arms reach out before folding, and its loop is too faint at 192 px. Pass 3 queued: the ears use the approved Night Stalk pose (stalk f18) at full amplitude, a chin-up head snap in hurt, split arms with claws toward the opponent and an elbow-led path in guard, a livelier loop. The ankle gets a direction-aware driver and pointed-foot keys (needed for move).
- 2026-11-09: ankle fix in rig-p8b (e644319b): the crouch ankle keys fire on flexion only; new `ankle_point_mid` and `ankle_point` keys fire while the foot points. Evade f3's ankle folds 169/429 to 0/0; a run toe-off at about 60 degrees 130/308 to 39/119 (approved crouch maximum 49/131). Idle and Night Stalk re-bake byte-identical. Pass 3 built (169814f7 to d0f12269): ears at the stalk f18 pose relative to the head in all three clips, hurt's chin-up snap leads the chest, evade's claws on the floor, guard split arms with a forearm-first path and a doubled breath with lagging head and paws. Open: guard's elbow keeps 4 collapsed triangles and the wrist 1 to 2 (approved 0, nothing folded), to be judged at 720 px by the critic; render_board.py's Blender drivers do not yet apply the ankle direction gate (clip renders and the game mesh do). Critic pass 3 running.
- 2026-11-09: critic pass 3. Evade passes (a tendon ridge and squared heel at f3 to f4 show at 720 px only; recheck with the run, which loads the same ankle keys harder). Hurt: the head snap now reads as struck; the ear pins in one frame and, riding the chin-up tilt, hangs as a lop ear on f3 to f6. Guard: the loop is alive and the seam invisible, but the ear lies flat (hammerhead) under the chin-down tuck, the wrists flop the paws forward palm-down (the begging cue), the shoulder swells into a ball with a crease at the upper arm, and the near forearm bends in an S. Pass 4: ears match stalk f18's line on screen, not its pose relative to the head; hurt's ear sweeps over f2 to f3; guard's forearms angle forward with the paws in line and an elbow-only bend, a shoulder shape check against stalk f18, and a shoulder corrective if the new arm pose still swells it.
- 2026-11-10: pass 4 (0e6c69bf to 9bb12a02): the ears draw stalk f18's line on screen; the guard head raised 14 degrees so the ear root stays at the approved fold count; guard forearms angled from a low elbow with the paw in line (the S came from the elbow keys' spread plus a 56 degree wrist cock); new shoulder keys behind a direction gate. Critic pass 4: hurt passes (evade passed in pass 3). Guard does not: the raised head leaves the face exposed above throat-height paws (an alert meerkat, not a guard), the shoulder front still swells, and guard_out holds the arms then drops them in two frames. Pass 5 (guard only): lean the trunk from the hips like Night Stalk f18 with the neck holding the head's world orientation, so the face drops behind the paws without breaking the ear line; fix the shoulder at the cause (the swing direction, not its size); spread the exit drop over out f1 to f5.
- 2026-11-10: pass 5 stopped at the setup check: a face-covering guard does not fit Akinza (the eyes sit 0.29 m above the shoulders, the arm plus paw is 0.42 m; leaning the trunk lowers the face and the paws together). Raising the elbows to shoulder height collapsed the shoulder (745 folded triangles), and tucking the head folded the ear root (188 against 50). Decision (orchestrator, overridable by Nick): the guard is a crouched, claws-out stance like the sparring kangaroos in the reference: the trunk leaned from the hips with the head held level, the knees deeper, the forearms forward with the claws leading, the arms split, and the face visible. The shoulder bump comes from the clavicle's pull and the inward turn of the upper arm; it is fixed by the arm direction (clavicle at rest, upper arm 7 degrees out, about 70 degrees forward, under 76.9 degrees of swing), not by keys.
