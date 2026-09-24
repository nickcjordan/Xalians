# Powerworks play screen: orders on the stage

Immersive brief for the Powerworks planning screen, from Nick on 2026-09-23: "I want to get rid of this row of cards and move the functionality into better places. I don't think we need to have the bottom row at all because the creatures are right there to select from the avatars. So we can just select the creature individually. And then, as far as their moves, I feel like a better user experience would be once you select a creature, their moves appear in a radial condensed view just above the selected creature like other video games do instead of aligning to a table row below. The UX needs to move closer to an actual video game."

The immersive tier was parked on 2026-09-11 until Nick restarted it; this is his word for Powerworks' play screen only. The briefing, draft, camp and results screens are unchanged.

## Context

Planning today is three stacked bands under the stage: a command head and a four-card move tray for the selected companion, then a row of four squad cards (portrait, name, the queued order), then the commit bar. The stage above already shows every companion with a plaque, and target reticles appear on the stage once a move is chosen. The two lower bands repeat what the stage shows, split the eye between the scene and a table, and take height from the scene.

## Assumptions & Decisions

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 1 | The squad row and the move tray are removed. The stage is the only place orders are given; the commit bar stays. | 95%, Nick's request | Nick, 2026-09-23 |
| 2 | Selecting a companion happens on the stage: its figure and its plaque are one selection control. The selected companion gets a ground ring under the figure and a raised plaque. Selecting another companion moves the ring; selecting the same one again closes its menu. | 90% | Nick: "select the creature individually" |
| 3 | The moves open as a **radial menu** anchored above the selected companion: four slots on an arc (a half ring over the head, like a MOBA or tactics game ability wheel), a slot per action in record order, the signature slot marked. Each slot shows the move's icon, its short name (one line, may clamp), its power number and its cooldown pips; an unavailable slot is dimmed with the reason's short form (cooling 2, bound, spent). | 85%, Nick's request; the arc shape is my call | Nick: "a radial condensed view just above the selected creature" |
| 4 | **Detail on demand.** Hover or keyboard focus on a slot shows a compact detail card beside the arc with the full plain-language reading the tray card showed today (what it does, reach and approach, area, tempo, likelihood). On touch, the first tap on a slot shows the detail and arms it; a second tap on the same slot chooses it. | 80% | the tray carried this text; games show it on hover |
| 5 | **Then the target.** Choosing a move closes the ring and shows the existing target reticles on legal targets (enemies, and squadmates for helpful moves), with the existing previews. Choosing a target sets the order. A move that acts only on its user sets the order immediately. Escape or a click on empty stage backs out one step. | 90% | existing target selection |
| 6 | **Auto-advance.** After an order is set, selection moves to the next standing companion in speed order without an order, and its ring opens; when every companion has an order, nothing is selected and the commit bar reads ready. | 80%, the convention of turn-based squad games | game convention |
| 7 | **The order lives on the plaque.** Each companion's plaque carries a compact order chip under its HP bar: move icon, short move name and an arrow to the target's short name, or "no order" in a quiet style. A dashed line from the companion to its target shows while planning (the existing intent line). Clicking the chip reopens that companion's ring. | 85% | the removed squad row carried this |
| 8 | **Space.** The freed height goes to the stage. The game is one fixed screen at 1280x720 and at 390x844: no page scroll, the commit control in view, the ring and its detail card fully inside the stage (they flip below the figure or shift sideways near an edge). Every slot is at least 44 by 44 px on a phone. | 95% | games are one fixed screen (Nick, 2026-09-22) |
| 9 | **Input.** Keys 1 to 4 choose a slot of the open ring; Tab and Shift+Tab move between companions; Enter or Space opens a ring; Escape backs out. The ring is a `role="menu"` with `menuitem` slots, focus enters it on open and returns to the companion on close; every control keeps a visible focus ring and an accessible name ("Select Crystorn", "Crystorn: Heavy Ram, power 60, ready"). | 85% | contract section 15 |
| 10 | **Motion.** The ring opens with a short scale-and-fade from the companion (one step of the motion scale), the ground ring does not pulse, and everything is instant under reduced motion. | 90% | DESIGN_SYSTEM.md motion rules |
| 11 | **Look.** Powerworks keeps its own stylesheets and art direction (the immersive tier may replace the chrome). The ring uses the game's existing plaque and move-card materials, colors and icons, not new ones: a slot is a small version of today's move card. No new color outside the game's existing palette. | 85% | the game's current look was paint-reviewed |
| 12 | Enemy inspect, the combat record, playback and the turn order keep working unchanged; the inspector stays reachable from the plaque's info button. | 95% | |

## Done when

Tests pass (rules unchanged; page, scene and visuals tests updated to the new controls), a paint check at 1280x720 and 390x844 covers: nothing selected, a ring open on a companion at each edge of the stage and in the middle, a slot's detail card, target selection with a preview, all four orders set, and a phone ring. Measurements: no page scroll, commit in view, ring and detail inside the stage, every slot receives its click at its center, slot size on phone. An independent reviewer judges the screenshots against this brief before the PR opens.

## Round 2: what a move shows, and choosing one, 2026-09-23

Nick on the shipped wheel (PR #611): "a step in the right direction ... I see symbols and numbers, but I don't know what they mean. I want you to ask yourself what of these need to be shown and what value they provide if they're shown, and which ones might make more sense to initially hide until hover or until you select it ... Once you click the move, it just goes away. I feel like what would be a better look is having the move expand to show the rest of the details of it, indicating that you selected that move, and then show how the selected move would affect each of the creatures. You sort of have this now, but it shows as more of a informational label log than a visual affordance like you would expect in video game. ... animations to do things like fade in and out when you select and deselect things, or zoom in on something when it's selected."

### What each mark on a disc is for

| Mark today | What it tells the player | Needed to choose at a glance? | Round 2 |
|---|---|---|---|
| Move icon | the kind of act: strike, bind, pull, guard, heal, status | yes, it is the fastest read | **keep**, larger |
| Name | which move this is | yes, identity | **keep** |
| Gold rim | this is the signature | yes, cheap and learned once | **keep** |
| Power badge (glyph + number) | base power before matchup and guards | no: the number that matters is what it does to a particular target, which depends on the target | **hide** at rest; show in the expanded card, and as real outcomes on each target |
| Bind count badge ("⇔ 1") | the bind holds one action | no | **hide**; the expanded card says it in words |
| Cooldown pips or ∞ under the disc | how long the move rests after use | no, it is a cost, not a choice | **hide** at rest; the expanded card says "rests 1 round after use" or "use every round" |
| Unavailable tag (cooling 2, bound, spent) | why it cannot be chosen now | yes | **keep**, as the only small tag: the disc is dimmed and carries one short word or a round count |
| Hotkey keycap | keyboard shortcut | only for keyboard players | **show only after a key has been pressed** in this session (keyboard modality), hidden for pointer and touch |

At rest a disc is: icon, name, gold rim if signature; dimmed with one short reason if unavailable. Nothing else.

### Choosing a move

1. **Hover or focus** a disc: it lifts and brightens (scale up slightly, glow), the other discs soften; no card yet on desktop. On touch the first tap does the same and arms it.
2. **Choose** a disc (click, second tap, key): the chosen disc **expands in place into the move card** while the other discs fade and shrink back into the creature. The card is the chosen move's full reading in plain words: what it does, power, reach (melee or ranged, closes in), area, status and its chance, how long it rests after use. It stays open through targeting, marked as the chosen move, with a small back control that returns to the wheel (Escape does the same).
3. **The stage shows what the move will do, on the creatures themselves**, not as text labels:
   - Every legal target gets a target ring at its feet; illegal units dim and desaturate.
   - **Damage** shows on each target's HP bar as a highlighted chunk the move would remove (the preview amount), with the number riding the bar. A knockout preview shows the whole remaining bar highlighted and a skull mark.
   - **Heals** show as a green extension on a squadmate's HP bar.
   - **Statuses** show as a ghost of the status badge on the target with its chance ("75%").
   - **Guarded or immune** targets show the chunk shrunk and a small shield, or "no effect".
   - **Area moves** also mark every unit the area would reach, each with its own chunk; squadmates the area reaches are marked in the danger color.
   - **Pulls and pushes** show a short arrow on the target.
4. **Hovering or focusing a target** raises it (scale up slightly), draws the intent line from the actor to it, and the move card adds one line for that target ("Crawler 1: 5 damage, 22 to 17").
5. **Confirming** a target: the order locks with a short beat (the target ring flashes once, the card collapses into the actor's plaque chip), and the next companion without an order is selected.

### Motion and focus

- The wheel's discs open with a short staggered fade and scale out from the creature; they fold back the same way on close.
- **Zoom:** while a companion is selected the stage eases in slightly toward it (a small scale on the stage layer with the origin at the companion), and eases back out when nothing is selected. Small enough that no enemy leaves the frame.
- Target previews fade in; dimmed units fade down; everything is instant under reduced motion. No looping animation except that the chosen target ring may breathe gently while a move is armed, and that too is off under reduced motion.
- Durations stay short (about 120 to 250 ms), so planning never waits on an animation.

### Done when

Same paint check as round 1, plus: a rest-state wheel with a signature and an unavailable disc; a hovered disc; the expanded card during targeting with damage chunks on two enemies, a status ghost with its chance, and an area move marking a second target; a heal preview on a squadmate; a hovered target with its intent line and card line; the order locked with the chip set; and frame captures at the midpoint of the open, expand and zoom animations to show they run. Measurements as before, plus the zoom never pushes any unit's plaque outside the stage. An independent reviewer judges the result against this section before the PR opens.
