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

## Round 3: calm camera, element on the move, every mark earns its place, 2026-09-24

Nick on round 2 (PR #624): "overall, I think your changes are great. You went a tad heavy on the view focusing in and out between selecting creatures. And I also think it's causing a little bit of blurriness ... save the camera zooming in and out and moving around like that for the cinematic playout of the actions, not for the move selection portion. ... adjust affordances from being something like a water icon in an otherwise standardly styled card to maybe adjusting that so that it has a background that aligns to that element color, Or an outline, or maybe you just do that for the moves themselves that are elemental. I actually feel like I'd like that better because right now the moves are just a name, and there's not much of an indication as to how a move ... might affect a creature until you click it. ... it says it rests two turns after use and it charged, and it's a melee attack, and it's three power, but other than three power, I don't know how any of that actually affects. ... is that every move, or is my move different? ... identify areas where something is shown like this, and ask yourself if it's being beneficial by being shown or if it's just providing unnecessary details or details that could be hidden away somewhere available when they go looking ... Or, better yet, details that could be afforded in a different way through a more subtle visual approach rather than just listing out a line of text."

### Camera

- **Planning holds still.** No zoom and no pan while selecting companions or moves. Selection is shown by the ground ring, the raised plaque and a slight dimming of the rest of the squad, never by moving the stage.
- **No scale transforms on anything that carries text or a thin line at rest or on hover.** Lifts use a small upward translate and a glow, not `scale()`, so text and HP bars stay crisp. (Scaling a layer rasterizes it and was the blur Nick saw.)
- **The camera moves during playback only.** When a round plays, the stage eases toward each acting unit and its target for that beat and returns between beats: a push-in of about 1.06 and a pan, 250 to 350 ms, instant under reduced motion, never pushing any plaque outside the stage. This is the cinematic the camera is for.

### Element on the move

- **An elemental move wears its element.** A disc whose move carries an element has that element's hue on its rim and a low wash of it behind the icon; the move card's frame and header take the same hue. A physical move (no element) keeps the steel rim. The signature keeps its gold rim, with the element wash inside it when elemental. Use the site's element hues through the existing element tokens; this is element-tagged content, which is exactly what those hues are for.
- **Before the click, hovering or focusing a disc previews its outcome** on the stage in a lighter form than the chosen state: each target's ring and HP chunk appear faintly, and matchup is shown on each target with a small up or down chevron beside its HP bar (strong or weak against this element). Moving off the disc clears it. On touch the arming tap does the same.

### Every mark earns its place

Audit of the move card as shipped in round 2, and what replaces each line:

| Shown today | What the player can do with it | Round 3 |
|---|---|---|
| "7 power" | nothing on its own: the outcome depends on the target, and the outcome is already drawn on every target | **remove** from the card; the outcomes on the creatures carry the numbers, and the hovered-target line keeps "4 damage, 22 to 18" |
| "Ranged attack" / "Melee attack" | matters only through its consequences: a bound unit cannot use a move that closes in, and striking the guardian in contact triggers its discharge | **remove** the line; show the consequence where it happens: the guardian's target preview carries a small "shocks back" mark with its damage when the move touches it, and a bound companion's closing moves are already dimmed with "bound" |
| "Rests 1 round after use" / "Use every round" | a cost, and only when it is not the default | **remove** the text; a move that rests shows small rest pips on the card and the disc's lower rim only while armed (one pip per round it rests), with a hover or focus tooltip "Unavailable for 2 rounds after use". A move usable every round shows nothing |
| "Charged" / prolonged preparation | the move lands a round later and can be broken by a pull or a bind | **replace** with a single charge mark on the disc and card (the game's charge icon) and, on the card, "Lands next round" as the one line of text; tooltip explains that a pull or bind breaks it |
| "40% chance: Blinded, its ranged damage halved for 2 opportunities" | useful, but it is already drawn on each target as a ghost badge with its chance | **shorten** to an icon row on the card: the status icon and its chance ("Blinded 40%"); the full sentence moves to a tooltip on that row |
| "Reaches the target and the next enemy in line" | useful, but already drawn by the area rings on the stage | **remove** the text; the stage shows who it reaches |
| "Chosen move" subtitle | the card's position and the expanded disc already say it | **remove** |
| Back button | needed | **keep**, as an icon button with the accessible name "Back to moves" |

The card after round 3: the move's name in its element frame, an icon row for its effects (harm, status with chance, pull, bind, heal, guard) with a tooltip each, the charge mark and rest pips only when they apply, the hovered target's one-line outcome, and Back. Every sentence that left the card is still reachable: on the tooltips, in the inspector, and in the target button's accessible name.

Apply the same test to the plaques and the stage: every icon, number and word visible during planning must answer a question the player has at that moment; anything else moves to hover, focus or the inspector. Report each item removed or moved.

### Done when

The round 2 paint check again, plus: a planning sequence captured frame by frame showing the stage does not move between selections; text and HP bars crisp at 100% zoom (compare a crop of a plaque at rest and on hover); an elemental disc, a physical disc and an elemental signature side by side; a hover preview before the click with matchup chevrons; the trimmed card for a charged move that rests two rounds; the guardian's "shocks back" mark; and playback frames showing the camera push-in on an acting unit and its return. An independent reviewer judges against this section.

## Overlay pass: the stage holds its size, hover only where it is real, 2026-09-24

Three defects on the live round 3 page. **The stage shrank when a round played** (563 to 433 px at 1280x720, 682 to 517 at 390x844) because a playback panel appeared under it and repeated the stage's banner. The panel is gone: the playback controls (Pause or Resume, Next, speed, Show round result) take Commit's place in the bottom bar, which is there in both phases, and the on-stage banner is the one place a beat is named, on every beat now rather than only signatures, blocks and redirects. Its second line names the target before the blow and says what it did once it lands; it keeps its room from the start of the beat, so the banner never grows under a pushed squad. **Touch left a sticky hover**: the "Targeted by" list stayed on the stage after the last target tap, with empty squares where thumbnails were hidden on phones. It now opens only on a mouse hover or keyboard focus, closes on the next tap anywhere, and reads as a sentence whose names are the controls ("Targeted by Avilily, Graviclaw and Crystorn"). **Every other hover in planning** (disc lift and softening, mark tooltips, the back control, the order chip, button highlights) applies only under `(hover: hover) and (pointer: fine)`; on touch the same looks come from keyboard focus and the arming tap, and a target's aim follows a mouse or the keyboard, never a tap.

## Layout pass: the game is the whole screen, 2026-09-24

Nick, 2026-09-24, on the live page at 2549x1435: the content was "shrunken down to a rectangle in the center of the screen with a bunch of wasted space on the edges", with "the weird bar going across the top in the middle of the screen", and the screen should sit somewhere between the old card rows and the bare stage. The cause was the desktop composition bound from decision 8: the stage was capped at 1320 by 620 pixels and centered vertically, so the sector bar floated wherever the cap left it, and on a 2560 by 1440 screen three fifths of the area was empty.

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 1 | **One console scale.** The play screen is composed at 1280x720. On a larger landscape screen the whole page is drawn larger with CSS `zoom` by the smaller of width/1280 and height/720 (`consoleScale`), never below 1, so every piece grows together the way a console game's interface does and nothing is left as margin. Zoom lays the page out again at the new size, so text stays crisp (the round 3 blur came from a transform scale). Viewport units inside the page read `--pw-vw` and `--pw-vh`, one percent of the viewport in the zoomed page's own pixels, and the stage map divides client rects by the zoom so the wheel, the card and the camera place exactly as at 1x. | 85% | 1920x1080 draws at 1.5, 2560x1440 at 2, Nick's 2549x1435 at 1.99; paint checks below |
| 2 | **The stage fills the space between the bars, edge to edge.** The composition cap and the auto margins are gone on every screen wider than a phone; the stage frame loses its rounded border. | 90% | before: the stage was 1320x620 of a 2560x1440 screen; after: 2560x1208 |
| 3 | **One HUD bar.** In play, the header holds the way out, the sector and its name, the route diamonds, the round, and the tools in one row; the separate sector bar is gone, so nothing splits the screen. Below 1100 pixels wide the sector eyebrow, the "Turn order" sub-label and the tool names hide visually (the diamonds already say the sector; the tools keep their names for assistive technology). A phone keeps its two rows: tools, then where the squad is. The route diamonds' digits now stand upright (they turned with the diamond). | 85% | Nick's screenshot |
| 4 | **The turn order comes back as a strip in the bottom bar.** This is the middle ground between the old card rows and the bare stage: the information the old squad row carried that the stage did not (who acts when, and whose order is still missing), shown as figures, not text. Every standing unit in the order the round resolves, read left to right with small chevrons; machines wear a red rim; a companion's rim is dashed until its order is set and then solid with a dot. A companion's figure selects it; a machine's opens its inspector; the label opens the turn order panel with speeds. While a round plays the acting unit is lit and the ones that have acted fade. It is hidden on a phone, where the bar only fits the count and the forward control. | 75% | the old squad row; affordances, not labels |
| 5 | **The turn order reads the orders.** The strip, the panel and the playback order now pass the machines' orders and the squad's plans to `initiative`, as `resolveRound` does, so an immediate move moves its companion up the moment it is chosen. Before this, the panel and the playback order ignored the orders and could disagree with the round that actually played. | 95% | `resolveRound` calls `initiative(..., {...s.orders, ...orders})` |
| 6 | **A phone on its side asks to be turned upright.** A coarse-pointer landscape screen under 480 pixels tall used to scroll 260 pixels; it now shows one line, "Turn your screen upright to play." | 80% | 844x390 scrolled; games are one fixed screen |

Paint checks (headless Chrome, `scratchpad/layout/snap.cjs`, `play.cjs`, `camp.cjs`): no page scroll at 3440x1440, 2560x1440, 1920x1080, 1440x900, 1280x720, 1024x768 and 390x844; the stage measures 2560x1208 at 2560x1440 and 1280x604 at 1280x720; the wheel opens over the selected figure and the order card aims correctly at zoom 2; playback pushes in on the actor with the banner above the bottom bar and the strip lighting the acting unit; the camp screen and the field guide fit the screen at zoom 2 (the guide was cut off until its viewport units were converted); no console errors.
